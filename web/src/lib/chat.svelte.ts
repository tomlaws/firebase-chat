import { PUBLIC_RTDB_URL } from '$env/static/public';
import {
    collection,
    getDocs,
    getFirestore,
    limit,
    onSnapshot,
    orderBy,
    query,
    QueryDocumentSnapshot,
    startAfter,
    Timestamp,
    where,
    type DocumentData,
    type Unsubscribe
} from "firebase/firestore";
import { getDatabase, ref, onValue, set, serverTimestamp, onDisconnect, off } from "firebase/database";
import { firebaseApp, functions } from "./firebase";
import { httpsCallable } from 'firebase/functions';
import { v7 as uuidv7 } from 'uuid';

export type Conversation = {
    lastChunkSize: number;
    members: string[];
    updatedAt: Timestamp;
    recentMessages: QueryDocumentSnapshot<DocumentData, DocumentData>[];
    user: Promise<{
        username: string;
        displayName: string;
    }>;
};

export type Message = {
    text: string;
    timestamp: Timestamp | Date;
    uid: string;
    tmpId?: string;
};

export const chat = createChat();

const rtdb = getDatabase(firebaseApp, PUBLIC_RTDB_URL);

export function createChat() {
    let currentUid = $state<string>();
    let loaded = $state<boolean>(false);
    let conversations = $state<Array<QueryDocumentSnapshot<DocumentData, DocumentData>>>([]);
    let recentMessagesMap = $state<Record<string, Message[]>>({});
    let newMessagesMap = $state<Record<string, Message[]>>({}); // to be processed
    let sendingMessagesMap = $state<Record<string, Message[]>>({});
    let unsub: null | (() => Promise<void>) = null;

    function initializeChat(uid: string): Unsubscribe {
        currentUid = uid;
        const q = query(
            collection(getFirestore(), "chats"),
            where("members", "array-contains", uid),
            orderBy("updatedAt", "desc"),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            loaded = true;
            const docs = snapshot.docs;
            for (const doc of docs) {
                const chatId = doc.id;
                const idx = conversations.findIndex((c) => c.id === chatId);
                if (idx !== -1) {
                    conversations[idx] = doc;
                } else {
                    conversations.push(doc);
                }
                const recentMessages = doc.data().recentMessages || [];
                if (recentMessagesMap[chatId]) {
                    const oldLen = recentMessagesMap[chatId].length;
                    const newMessages = recentMessages.slice(oldLen);
                    if (newMessages.length > 0) {
                        if (!newMessagesMap[chatId]) {
                            newMessagesMap[chatId] = [];
                        }
                        newMessagesMap[chatId] = newMessagesMap[chatId].concat(newMessages);
                        removeMessagesFromSending(chatId);
                    }
                }
                recentMessagesMap[chatId] = recentMessages;
            }
            conversations.sort(
                (a, b) =>
                    b.data().updatedAt.toMillis() - a.data().updatedAt.toMillis()
            );
        });

        const stopPresenceTracking = initPresence(uid);

        unsub = async () => {
            await stopPresenceTracking();
            unsubscribe();
        }
        return close;
    }

    async function close() {
        await unsub?.();
        unsub = null;
    }

    function initPresence(uid: string) {
        const connected = ref(rtdb, `users/${uid}/connected`);
        const lastSeenRef = ref(rtdb, `users/${uid}/lastSeen`);
        const intervalId = setInterval(() => {
            // set lastSeen to server timestamp every minute
            set(lastSeenRef, serverTimestamp);
        }, 60 * 1000); // Every minute

        onValue(lastSeenRef, (snapshot) => {
            set(lastSeenRef, serverTimestamp());
        }, { onlyOnce: true });

        const unsub = onValue(connected, (snapshot) => {
            if (!snapshot.exists() || !snapshot.val()) {
                set(connected, true)
            }
        });
        onDisconnect(connected).set(false);

        // Return a cleanup function to remove the listener
        return async () => {
            unsub();
            await Promise.all([
                set(connected, false),
                set(lastSeenRef, serverTimestamp())
            ]);
            clearInterval(intervalId);
        };
    }

    async function getMoreConversations() {
        if (!currentUid || conversations.length === 0) return;

        const lastConversation = conversations[conversations.length - 1];
        const q = query(
            collection(getFirestore(), "chats"),
            where("members", "array-contains", currentUid),
            orderBy("updatedAt", "desc"),
            startAfter(lastConversation),
            limit(10)
        );

        const result = await getDocs(q);
        for (const doc of result.docs) {
            const idx = conversations.findIndex((c) => c.id === doc.id);
            if (idx !== -1) {
                conversations[idx] = doc;
            } else {
                conversations.push(doc);
            }
            const recentMessages = doc.data().recentMessages || [];
            recentMessagesMap[doc.id] = recentMessages;
        }
        conversations.sort(
            (a, b) =>
                b.data().updatedAt.toMillis() - a.data().updatedAt.toMillis()
        );
    }

    function getLoaded() {
        return loaded;
    }

    function getUid() {
        return currentUid;
    }

    function getRecentMessages(chatId: string) {
        const recentMessages = recentMessagesMap[chatId] || [];
        const sendingMessages = sendingMessagesMap[chatId] || [];
        // merge recentMessages and sendingMessages according to timestamp
        const merged = [...recentMessages, ...sendingMessages];
        merged.sort((a, b) => a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : a.timestamp.getTime() - (b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : b.timestamp.getTime()));
        return merged;
    }

    function watchUserPresence(
        targetUid: string,
        callback: (isOnline: boolean, lastSeen?: number) => void
    ) {
        const connectedRef = ref(rtdb, `users/${targetUid}/connected`);
        const lastSeenRef = ref(rtdb, `users/${targetUid}/lastSeen`);

        const unsub = onValue(connectedRef, (snapshot) => {
            const isOnline = snapshot.exists() && snapshot.val() === true;
            if (isOnline) {
                callback(true);
            } else {
                onValue(lastSeenRef, (lastSnap) => {
                    callback(false, lastSnap.val());
                }, { onlyOnce: true });
            }
        });

        // Return a cleanup function
        return () => {
            unsub();
        };
    }

    function sendMessage(chatId: string, to: string, text: string) {
        const sendFunc = httpsCallable(functions, "sendMessage");
        // add to sendingMessagesMap immediately for optimistic UI
        if (!sendingMessagesMap[chatId]) {
            sendingMessagesMap[chatId] = [];
        }
        let message: Message = {
            text: text,
            timestamp: new Date(),
            uid: currentUid!,
            tmpId: uuidv7()
        };
        sendingMessagesMap[chatId].push(message);
        sendFunc({ text, to })
            .then((result) => {
                // update timestamp
                for (const msg of sendingMessagesMap[chatId]) {
                    if (msg.tmpId === message.tmpId) {
                        const timestampStr = (result.data as any).message.timestamp;
                        msg.timestamp = new Timestamp(timestampStr._seconds, timestampStr._nanoseconds);
                        delete msg.tmpId;
                        removeMessagesFromSending(chatId);
                        break;
                    }
                }
            })
            .catch((error) => {
                console.error("Error calling function:", error);
            });
    }

    function removeMessagesFromSending(chatId: string) {
        if (!sendingMessagesMap[chatId]) return;
        const sendingMessages = sendingMessagesMap[chatId];
        const newMessages = newMessagesMap[chatId] || [];
        if (newMessages.length == 0) return;
        for (let i = newMessages.length - 1; i >= 0; i--) {
            const newMsg = newMessages[i];
            for (let j = sendingMessages.length - 1; j >= 0; j--) {
                const sendingMsg = sendingMessages[j];
                if (sendingMsg.uid === newMsg.uid && sendingMsg.text === newMsg.text && sendingMsg.timestamp instanceof Timestamp && newMsg.timestamp instanceof Timestamp && sendingMsg.timestamp.isEqual(newMsg.timestamp)) {
                    sendingMessages.splice(j, 1);
                    newMessages.splice(i, 1);
                }
            }
        }
        sendingMessagesMap[chatId] = sendingMessages;
        sendingMessagesMap = sendingMessagesMap;
    }

    return {
        getLoaded,
        getUid,
        conversations,
        initializeChat,
        getMoreConversations,
        getRecentMessages,
        watchUserPresence,
        sendMessage,
        close
    }
}
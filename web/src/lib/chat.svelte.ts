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
import { firebaseApp } from "./firebase";

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
export const chat = createChat();

const rtdb = getDatabase(firebaseApp, PUBLIC_RTDB_URL);

export function createChat() {
    let currentUid = $state<string>();
    let conversations = $state<Array<QueryDocumentSnapshot<DocumentData, DocumentData>>>([]);
    let recentMessagesMap = $state<Record<string, any[]>>({});
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
            const docs = snapshot.docs;
            for (const doc of docs) {
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
            console.log("Cleaning up presence tracking for", uid);
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

    function getUid() {
        return currentUid;
    }

    function getRecentMessages(chatId: string) {
        return recentMessagesMap[chatId] || [];
    }

    function watchUserPresence(
        targetUid: string,
        callback: (isOnline: boolean, lastSeen?: number) => void
    ) {
        console.log("Watching presence for", targetUid);
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

    return {
        getUid,
        conversations,
        initializeChat,
        getMoreConversations,
        getRecentMessages,
        watchUserPresence,
        close
    }
}
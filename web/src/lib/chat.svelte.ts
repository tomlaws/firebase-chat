import {
    collection,
    doc,
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

export function createChat() {
    let currentUid = $state<string>();
    let conversations = $state<Array<QueryDocumentSnapshot<DocumentData, DocumentData>>>([]);
    let recentMessagesMap = $state<Record<string, any[]>>({});
    
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
        return () => unsubscribe?.();
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
        console.log(conversations)
    }

    function getUid() {
        return currentUid;
    }

    function getRecentMessages(chatId: string) {
        return recentMessagesMap[chatId] || [];
    }

    return {
        getUid,
        conversations,
        initializeChat,
        getMoreConversations,
        getRecentMessages
    }
}
<script lang="ts">
    import { onMount, untrack, type SvelteComponent } from "svelte";
    import {
        onSnapshot,
        query,
        collection,
        limit,
        QueryConstraint,
        getFirestore,
        QueryDocumentSnapshot,
        startAfter,
        Query,
        type DocumentData,
        QueryOrderByConstraint,
        getDocs,
    } from "firebase/firestore";
    import { chat } from "@/chat.svelte";

    let {
        children,
        chatId,
        queryConstraints = [],
        orderBy,
        transform,
    } = $props<{
        children?: (item: any) => SvelteComponent;
        chatId: string;
        queryConstraints?: QueryConstraint[];
        orderBy: QueryOrderByConstraint;
        transform?: (data: any[]) => any[];
    }>();
    let path = $derived(`chats/${chatId}/messages`);
    type Chunk = {
        query?: Query<DocumentData, DocumentData> | null;
        doc: QueryDocumentSnapshot<DocumentData, DocumentData>;
    };
    // newer chunks at the start of the array
    let chunks = $state<Chunk[]>([
        {
            query: undefined,
            doc: {
                id: null,
                data: () => ({ items: [] }),
            } as unknown as QueryDocumentSnapshot<DocumentData, DocumentData>,
        },
    ]);

    let recentMessageSize = 0;
    $effect(() => {
        const recentMessages = chat.getRecentMessages(chatId) ?? [];
        untrack(() => {
            if (recentMessages.length < recentMessageSize) {
                // insert new chunk for recentMessages
                chunks.unshift({
                    query: undefined,
                    doc: {
                        id: "recent",
                        data: () => ({ items: recentMessages }),
                    } as unknown as QueryDocumentSnapshot<
                        DocumentData,
                        DocumentData
                    >,
                });
            } else {
                // update recent message chunk
                chunks[0] = {
                    query: undefined,
                    doc: {
                        id: "recent",
                        data: () => ({ items: recentMessages }),
                    } as unknown as QueryDocumentSnapshot<
                        DocumentData,
                        DocumentData
                    >,
                };
            }
            recentMessageSize = recentMessages.length;
        });
    });

    async function fetchMore() {
        const oldest = chunks[chunks.length - 1];
        if (oldest) {
            console.log("Fetching more chunks after:", oldest.doc.id);
            const q = query(
                collection(getFirestore(), path),
                ...queryConstraints,
                orderBy,
                startAfter(oldest.doc.id),
                limit(1),
            );
            const result = await getDocs(q);
            const doc = result.docs;
            if (doc.length > 0) {
                chunks = [...chunks, { query: q, doc: doc[0] }];
            }
        }
    }

    function observeScrollEnd(node: Element) {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                if (chunks.length >= 2) {
                    fetchMore();
                } else {
                    listenForNewChunks();
                }
            }
        });
        observer.observe(node);
        return {
            destroy() {
                observer.disconnect();
            },
        };
    }

    function getChunkItems(chunk: Chunk) {
        const data = chunk.doc.data();
        return transform ? transform(data.items ?? []) : (data.items ?? []);
    }

    let unsubscriberListenNewChunks: (() => void) | null = null;
    function listenForNewChunks() {
        if (unsubscriberListenNewChunks) return;
        console.log("Listening for new chunks on path:", path);
        unsubscriberListenNewChunks = onSnapshot(
            query(
                collection(getFirestore(), path),
                ...queryConstraints,
                orderBy,
                limit(1),
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const doc = change.doc;
                    if (chunks.find((c) => c.doc.id === doc.id)) {
                        console.log("Chunk updated:", doc.id);
                        // replace existing chunk
                        const updated = chunks.map((c) =>
                            c.doc.id === doc.id ? { ...c, doc: doc } : c,
                        );
                        chunks = updated;
                    } else {
                        console.log("New chunk detected:", doc.id);
                        // add new chunk
                        const chunk = {
                            query: null,
                            doc: doc,
                        };
                        chunks[1] = chunk; // insert after recentMessages chunk
                    }
                });
            },
        );
    }

    onMount(() => {
        return () => {
            unsubscriberListenNewChunks?.();
        };
    });
</script>

<div class="overflow-y-auto flex-1 flex flex-col flex-col-reverse min-h-0">
    {#each chunks as chunk}
        <div class="item">
            {#each getChunkItems(chunk) as item}
                {@render children?.(item)}
            {/each}
        </div>
    {/each}
    {#key chunks.length}
        <div use:observeScrollEnd class="scroll-trigger"></div>
    {/key}
</div>

<style>
    .scroll-trigger {
        height: 1px;
    }
</style>

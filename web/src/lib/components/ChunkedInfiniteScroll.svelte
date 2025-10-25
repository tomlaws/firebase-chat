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
        QuerySnapshot,
        type DocumentData,
        QueryOrderByConstraint,
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
        visible: boolean;
    };
    // newer chunks at the start of the array
    let chunks = $state<Chunk[]>([
        {
            query: undefined,
            doc: {
                id: null,
                data: () => ({ items: [] }),
            } as unknown as QueryDocumentSnapshot<DocumentData, DocumentData>,
            visible: true,
        },
    ]);
    const observers = new Map<
        Query<DocumentData, DocumentData>  | null | undefined,
        IntersectionObserver
    >();
    const unsubscribers = new Map<
        Query<DocumentData, DocumentData>,
        () => void
    >();
    $inspect(chunks);
    let recentMessageSize = 0;
    $effect(() => {
        const recentMessages = chat.getRecentMessages(chatId) ?? [];
        console.log("Recent messages updated:", JSON.stringify(recentMessages));
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
                    visible: true,
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
                    visible: true,
                };
            }
            recentMessageSize = recentMessages.length;
        });
    });
    function subscribeQuery(query: Query<DocumentData, DocumentData>) {
        if (!query || unsubscribers.has(query)) return;
        const unsubscribe = onSnapshot(
            query,
            (snapshot: QuerySnapshot<DocumentData, DocumentData>) => {
                for (const doc of snapshot.docs) {
                    // check if chunk already exists
                    if (chunks.find((c) => c.doc.id === doc.id)) {
                        // replace existing chunk
                        const updated = chunks.map((c) =>
                            c.doc.id === doc.id ? { ...c, doc: doc } : c,
                        );
                        chunks = updated;
                        continue;
                    }
                    const index = chunks.findIndex((c) => c.doc.id < doc.id);
                    if (index === -1) {
                        chunks = [...chunks, { query, doc, visible: true }];
                    } else {
                        const before = chunks.slice(0, index);
                        const after = chunks.slice(index);
                        chunks = [
                            ...before,
                            { query, doc, visible: true },
                            ...after,
                        ];
                    }
                }
            },
        );
        unsubscribers.set(query, unsubscribe);
    }

    function unsubscribeQuery(query: Query<DocumentData, DocumentData>) {
        if (!query) return;
        const unsub = unsubscribers.get(query);
        if (unsub) {
            unsub();
            unsubscribers.delete(query);
        }
    }

    function observeChunk(node: Element, chunk: Chunk) {
        if (!chunk) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                chunk.visible = entry.isIntersecting;
                if (entry.isIntersecting) {
                    console.log("Chunk visible:", chunk.doc.id);
                    subscribeQuery(chunk.query!);
                } else {
                    console.log("Chunk not visible:", chunk.doc.id);
                    unsubscribeQuery(chunk.query!);
                }
            },
            { threshold: 0 },
        );

        observer.observe(node);
        observers.set(chunk.query, observer);

        return {
            destroy() {
                observer.disconnect();
                observers.delete(chunk.query!);
            },
        };
    }

    function observeScrollEnd(node: Element) {
        const observer = new IntersectionObserver(([entry]) => {
            console.log("Scroll end observed:", path);
            if (entry.isIntersecting) {
                listenForNewChunks();
                const oldest = chunks[chunks.length - 1];
                if (oldest) {
                    const q = query(
                        collection(getFirestore(), path),
                        ...queryConstraints,
                        orderBy,
                        startAfter(oldest.doc.id),
                        limit(1),
                    );
                    subscribeQuery(q);
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
                        subscribeQuery(
                            query(
                                collection(getFirestore(), path),
                                ...queryConstraints,
                                orderBy,
                                startAfter(doc.id),
                                limit(1),
                            ),
                        );
                        // add new chunk
                        const chunk = {
                            query: null,
                            doc: doc,
                            visible: true,
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
            observers.forEach((observer) => observer.disconnect());
            unsubscribers.forEach((unsub) => unsub());
        };
    });
</script>

<div class="overflow-y-auto flex-1 flex flex-col flex-col-reverse min-h-0">
    <!-- <div>
        {#each recentMessages as item}
            {@render children?.(item)}
        {/each}
    </div> -->
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

<!-- {#if loading}
    <div class="loading">Loading…</div>
{/if} -->

<style>
    .scroll-trigger {
        height: 1px;
    }
</style>

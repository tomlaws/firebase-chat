<script lang="ts">
    import { onMount, type SvelteComponent } from "svelte";
    import {
        getDocs,
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

    let {
        children,
        path,
        queryConstraints = [],
        orderBy,
        transform,
    } = $props<{
        children?: (item: any) => SvelteComponent;
        path: string;
        queryConstraints?: QueryConstraint[];
        orderBy: QueryOrderByConstraint;
        transform?: (data: any[]) => any[];
    }>();

    type Chunk = {
        query?: Query<DocumentData, DocumentData> | null;
        doc: QueryDocumentSnapshot<DocumentData, DocumentData>;
        visible: boolean;
    };
    let chunks = $state<Chunk[]>([]);
    let initialized = $state(false);
    const observers = new Map<
        Query<DocumentData, DocumentData>,
        IntersectionObserver
    >();
    const unsubscribers = new Map<
        Query<DocumentData, DocumentData>,
        () => void
    >();

    function subscribeQuery(query: Query<DocumentData, DocumentData>) {
        if (!query || unsubscribers.has(query)) return;
        const unsubscribe = onSnapshot(
            query,
            (snapshot: QuerySnapshot<DocumentData, DocumentData>) => {
                for (const doc of snapshot.docs) {
                    // const data = doc.data();
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
        if (!chunk || !chunk.query) return;
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
        return transform ? transform(data.items ?? []) : data.items ?? [];

    }

    onMount(() => {
        const unsubscribe = onSnapshot(
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
                        // new chunk is created, subscribe back the previous chunk
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
                        chunks = [...chunks, chunk];
                    }
                });
                initialized = true;
            },
        );
        return () => {
            unsubscribe();
            observers.forEach((observer) => observer.disconnect());
            unsubscribers.forEach((unsub) => unsub());
        };
    });
</script>

<div class="overflow-y-auto flex-1 flex flex-col flex-col-reverse min-h-0">
    {#each chunks as chunk}
        <div use:observeChunk={chunk} class="item">
            {#each getChunkItems(chunk) as item}
                {@render children?.(item)}
            {/each}
        </div>
    {/each}
    {#if initialized}
        {#key chunks.length}
            <div use:observeScrollEnd class="scroll-trigger"></div>
        {/key}
    {/if}
</div>

<!-- {#if loading}
    <div class="loading">Loading…</div>
{/if} -->

<style>
    /* .item {
        padding: 1rem;
        border-bottom: 1px solid #ccc;
    } */
    .scroll-trigger {
        height: 1px;
    }
    .loading {
        text-align: center;
        padding: 1rem;
        font-style: italic;
        color: #666;
    }
</style>

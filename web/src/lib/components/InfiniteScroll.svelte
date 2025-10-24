<script lang="ts">
    import { onMount, type SvelteComponent } from "svelte";
    import {
        getDocs,
        onSnapshot,
        query,
        collection,
        orderBy,
        limit,
        QueryConstraint,
        getFirestore,
        QueryDocumentSnapshot,
        startAfter,
        Query,
        QuerySnapshot,
        type DocumentData,
    } from "firebase/firestore";

    let {
        children,
        path,
        queryConstraints = [],
        transform,
    } = $props<{
        children?: (item: any) => SvelteComponent;
        path: string;
        queryConstraints?: QueryConstraint[];
        transform?: (data: any[]) => any[];
    }>();

    type Chunk = {
        query?: Query<DocumentData, DocumentData> | null;
        doc: QueryDocumentSnapshot<DocumentData, DocumentData>;
        visible: boolean;
    };
    let chunks = $state<Chunk[]>([]);
    let initialized = $state(false);
    let loading = $state(false);
    const observers = new Map<
        Query<DocumentData, DocumentData>,
        IntersectionObserver
    >();
    const unsubscribers = new Map<
        Query<DocumentData, DocumentData>,
        () => void
    >();

    // async function loadChunk(
    //     path: string,
    //     after?: QueryDocumentSnapshot<DocumentData, DocumentData>,
    // ) {
    //     console.log("Loading older chunk after:", after?.id);
    //     if (loading) return;
    //     loading = true;
    //     try {
    //         let q;
    //         if (after) {
    //             q = query(
    //                 collection(getFirestore(), path),
    //                 ...queryConstraints,
    //                 orderBy("__name__", "desc"),
    //                 startAfter(after),
    //                 limit(1),
    //             );
    //         } else {
    //             chunks = [];
    //             q = query(
    //                 collection(getFirestore(), path),
    //                 ...queryConstraints,
    //                 orderBy("__name__", "desc"),
    //                 limit(1),
    //             );
    //         }

    //         const snapshot = await getDocs(q);
    //         snapshot.forEach((doc) => {
    //             const data = doc.data();
    //             const chunk = {
    //                 doc: doc,
    //                 items: data.items,
    //                 visible: true,
    //             };
    //             chunks = [...chunks, chunk];
    //             if (chunk.visible) subscribeQuery(chunk);
    //         });
    //     } catch (err) {
    //         console.error(`Failed to load chunk from ${path}:`, err);
    //     } finally {
    //         loading = false;
    //     }
    // }

    function subscribeQuery(query: Query<DocumentData, DocumentData>) {
        if (!query || unsubscribers.has(query)) return;
        const unsubscribe = onSnapshot(
            query,
            (snapshot: QuerySnapshot<DocumentData, DocumentData>) => {
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    // check if chunk already exists
                    if (chunks.find((c) => c.doc.id === doc.id)) {
                        // replace existing chunk
                        const updated = chunks.map((c) =>
                            c.doc.id === doc.id
                                ? { ...c, items: data.items }
                                : c,
                        );
                        chunks = updated;
                        continue;
                    }
                    // const chunk = {
                    //     doc: doc,
                    //     visible: true,
                    // };
                    // chunks = [...chunks, chunk];

                    // find the position to insert the new chunk
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
                // const chunk = chunks.find((c) => c.query === chunk.query);
                // if (!chunk) return;

                chunk.visible = entry.isIntersecting;
                // chunks = chunks.map((c) =>
                //     c.query === chunk.query
                //         ? { ...c, visible: entry.isIntersecting }
                //         : c,
                // );

                if (entry.isIntersecting) {
                    subscribeQuery(chunk.query!);
                } else {
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
                        orderBy("__name__", "desc"),
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
    onMount(() => {
        const unsubscribe = onSnapshot(
            query(
                collection(getFirestore(), path),
                ...queryConstraints,
                orderBy("__name__", "desc"),
                limit(1),
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const doc = change.doc;
                    if (chunks.find((c) => c.doc.id === doc.id)) {
                        // replace existing chunk
                        const updated = chunks.map((c) =>
                            c.doc.id === doc.id ? { ...c, doc: doc } : c,
                        );
                        chunks = updated;
                    } else {
                        // new chunk is created, subscribe back the previous chunk
                        subscribeQuery(
                            query(
                                collection(getFirestore(), path),
                                ...queryConstraints,
                                orderBy("__name__", "desc"),
                                startAfter(doc.id),
                                limit(1),
                            ),
                        );
                    }
                    const chunk = {
                        query: null,
                        doc: doc,
                        visible: true,
                    };
                    chunks = [...chunks, chunk];
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
        <div use:observeChunk={chunk}>
            {#each transform ? transform(chunk.doc.data().items ?? []) : (chunk.doc.data().items ?? []) as item}
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
    .item {
        padding: 1rem;
        border-bottom: 1px solid #ccc;
    }
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

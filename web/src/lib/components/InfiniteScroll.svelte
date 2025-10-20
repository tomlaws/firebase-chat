<script lang="ts">
    import { onMount, type SvelteComponent } from "svelte";
    import {
        getDocs,
        onSnapshot,
        query,
        collection,
        orderBy,
        limit,
        DocumentSnapshot,
        QueryConstraint,
        type DocumentData,
        getFirestore,
        QueryDocumentSnapshot,
        startAfter,
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

    let chunks = $state<
        {
            doc: QueryDocumentSnapshot<DocumentData, DocumentData>;
            items: any[];
            visible: boolean;
        }[]
    >([]);
    let initialized = $state(false);
    let loading = $state(false);
    const observers = new Map<string, IntersectionObserver>();
    const unsubscribers = new Map<string, () => void>();

    async function loadChunk(
        path: string,
        after?: QueryDocumentSnapshot<DocumentData, DocumentData>,
    ) {
        if (loading) return;
        loading = true;
        try {
            let q;
            if (after) {
                console.log("Loading chunk after:", after);
                q = query(
                    collection(getFirestore(), path),
                    ...queryConstraints,
                    orderBy("__name__", "desc"),
                    startAfter(after),
                    limit(1),
                );
            } else {
                chunks = [];
                q = query(
                    collection(getFirestore(), path),
                    ...queryConstraints,
                    orderBy("__name__", "desc"),
                    limit(1),
                );
            }

            const snapshot = await getDocs(q);
            snapshot.forEach((doc) => {
                const data = doc.data();
                const chunk = {
                    doc: doc,
                    items: data.items,
                    visible: true,
                };
                console.log(`appending chunk from ${path}:`, chunk);
                chunks = [chunk, ...chunks];
                if (chunk.visible) subscribeToChunk(chunk);
            });
        } catch (err) {
            console.error(`Failed to load chunk from ${path}:`, err);
        } finally {
            console.log("Finished loading chunk from:", path);
            loading = false;
        }
    }

    function subscribeToChunk(chunk: {
        doc: QueryDocumentSnapshot<DocumentData, DocumentData>;
        items?: any;
        visible?: boolean;
    }) {
        if (unsubscribers.has(chunk.doc.id)) return;
        const unsubscribe = onSnapshot(
            chunk.doc.ref,
            (doc: DocumentSnapshot<unknown, DocumentData>) => {
                const data = doc.data() as any;
                const index = chunks.findIndex((c) => c.doc.id === doc.id);
                console.log(
                    `Received update for chunk ${doc.id}:`,
                    data,
                    index
                );
                if (index !== -1) {
                    const updated = [...chunks];
                    updated[index].items = data.items;
                    chunks = updated;
                }
            },
        );
        unsubscribers.set(chunk.doc.id, unsubscribe);
    }

    function unsubscribeFromChunk(chunkId: string) {
        const unsub = unsubscribers.get(chunkId);
        if (unsub) {
            unsub();
            unsubscribers.delete(chunkId);
        }
    }

    function observeChunk(node: Element, chunkId: string) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                const chunk = chunks.find((c) => c.doc.id === chunkId);
                if (!chunk) return;

                chunk.visible = entry.isIntersecting;
                const updated = chunks.map((c) =>
                    c.doc.id === chunkId
                        ? { ...c, visible: entry.isIntersecting }
                        : c,
                );
                chunks = updated;

                if (entry.isIntersecting) {
                    subscribeToChunk(chunk);
                } else {
                    unsubscribeFromChunk(chunkId);
                }
            },
            { threshold: 0 },
        );

        observer.observe(node);
        observers.set(chunkId, observer);

        return {
            destroy() {
                observer.disconnect();
                observers.delete(chunkId);
            },
        };
    }

    function observeScrollEnd(node: Element) {
        const observer = new IntersectionObserver(([entry]) => {
            console.log("Scroll end observed:", path);
            if (entry.isIntersecting) {
                const oldest = chunks[chunks.length - 1];
                if (oldest) {
                    loadChunk(path, oldest.doc);
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
        console.log("Mounting InfiniteScroll for path:", path);
        const unsubscribe = onSnapshot(
            query(
                collection(getFirestore(), path),
                ...queryConstraints,
                orderBy("__name__", "desc"),
                limit(1),
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const doc = change.doc;
                        const data = doc.data();
                        // check if chunk already exists
                        if (chunks.find((c) => c.doc.id === doc.id)) {
                            return;
                        }
                        const chunk = {
                            doc: doc,
                            items: data.items,
                            visible: true,
                        };
                        chunks = [...chunks, chunk];
                        console.log(chunks);
                        subscribeToChunk(chunk);
                    }
                });
                initialized = true;
            },
        );
        return () => {
            observers.forEach((observer) => observer.disconnect());
            unsubscribers.forEach((unsub) => unsub());
            unsubscribe();
        };
    });
</script>

{#each chunks as chunk}
    <div use:observeChunk={chunk.doc.id}>
        {#each (transform ? transform(chunk.items ?? []) : (chunk.items ?? [])) as item}
            {@render children?.(item)}
        {/each}
    </div>
{/each}
{#if initialized}
    <div use:observeScrollEnd class="scroll-trigger"></div>
{/if}
{#if loading}
    <div class="loading">Loading…</div>
{/if}

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

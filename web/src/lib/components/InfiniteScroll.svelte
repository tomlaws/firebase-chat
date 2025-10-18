<script lang="ts">
    import { onMount, type SvelteComponent } from "svelte";
    import {
        getDocs,
        getDoc,
        onSnapshot,
        query,
        collection,
        where,
        orderBy,
        limit,
        type DocumentReference,
        DocumentSnapshot,
        Query,
        QueryConstraint,
        type DocumentData,
        getFirestore,
        doc,
    } from "firebase/firestore";

    let {
        children,
        path,
        queryConstraints = [],
    } = $props<{
        children?: (item: any) => SvelteComponent;
        path: string;
        queryConstraints?: QueryConstraint[];
    }>();

    let chunks = $state<
        { id: string; items: any[]; ref: DocumentReference; visible: boolean }[]
    >([]);
    let loading = $state(false);
    const observers = new Map<string, IntersectionObserver>();
    const unsubscribers = new Map<string, () => void>();

    async function loadChunk(path: string, before?: string) {
        if (loading) return;
        loading = true;
        try {
            let q;
            if (before) {
                console.log("Loading chunk before:", before);
                q = query(
                    collection(getFirestore(), path),
                    where("__name__", "<", before),
                    ...queryConstraints,
                    orderBy("__name__", "desc"),
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
                    id: doc.id,
                    items: data.items,
                    ref: doc.ref,
                    visible: !before,
                };
                chunks = [...chunks, chunk];
                if (chunk.visible) subscribeToChunk(chunk);
            });
        } catch (err) {
            console.error(`Failed to load chunk from ${path}:`, err);
        } finally {
            loading = false;
        }
    }

    function subscribeToChunk(chunk: {
        id: any;
        items?: any;
        ref: any;
        visible?: boolean;
    }) {
        if (unsubscribers.has(chunk.id)) return;
        const unsubscribe = onSnapshot(
            chunk.ref,
            (doc: DocumentSnapshot<unknown, DocumentData>) => {
                const data = doc.data() as any;
                const index = chunks.findIndex((c) => c.id === data.id);
                if (index !== -1) {
                    const updated = [...chunks];
                    updated[index].items = data.items;
                    chunks = updated;
                }
            },
        );
        unsubscribers.set(chunk.id, unsubscribe);
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
                const chunk = chunks.find((c) => c.id === chunkId);
                if (!chunk) return;

                chunk.visible = entry.isIntersecting;
                const updated = chunks.map((c) =>
                    c.id === chunkId
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
            if (entry.isIntersecting && !loading) {
                const oldest = chunks[chunks.length - 1];
                if (oldest) loadChunk(path, oldest.id);
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
        let initialized = false;
        // listen to new chunk
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
                        console.log(change)
                        const doc = change.doc;
                        const data = doc.data();
                        // check if chunk already exists
                        if (chunks.find((c) => c.id === data.id)) return;
                        const chunk = {
                            id: doc.id,
                            items: data.items,
                            ref: doc.ref,
                            visible: true,
                        };
                        chunks = [chunk, ...chunks];
                        subscribeToChunk(chunk);
                    }
                });
                if (!initialized) {
                    initialized = true;
                    if (snapshot.empty) {
                        loadChunk(path);
                    } else {
                        // load chunk before the newest one
                        const newest = snapshot.docs[0];
                        loadChunk(path, newest.id);
                    }
                }
            },
        );
        return () => {
            observers.forEach((observer) => observer.disconnect());
            unsubscribers.forEach((unsub) => unsub());
            unsubscribe();
        };
    });
    $effect(() => {
        console.log(path)
    });
</script>

{#each chunks as chunk}
    <div use:observeChunk={chunk.id}>
        {#each chunk.items as item}
            {@render children?.(item)}
        {/each}
    </div>
{/each}

<div use:observeScrollEnd class="scroll-trigger"></div>
{#if loading}
    <div class="loading">Loading more items…</div>
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

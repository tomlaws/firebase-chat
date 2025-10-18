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

    const {
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

    async function loadChunk(startAfterId?: string) {
        if (loading) return;
        loading = true;
        const r = await getDoc(doc(getFirestore(), "chats/AAeEPsuDUkcObYLAx2FtR7oF05e2_nZvylNeHiZQjWtmmkZWNUKp2qjm1/messages/0199f6e0-d45f-79f4-ab96-5a3d07f84d49"));
        console.log(r.data());
        try {
            let q;
            console.log(path);
            if (startAfterId) {
                console.log("Loading chunk after:", startAfterId);
                q = query(
                    collection(getFirestore(), path),
                    where("id", "<", startAfterId),
                    ...queryConstraints,
                    orderBy("__name__", "desc"),
                    limit(1),
                );
            } else {
                q = query(
                    collection(getFirestore(), path),
                    ...queryConstraints,
                    orderBy("__name__", "desc"),
                    limit(1),
                );
            }

            const snapshot = await getDocs(q);
            console.log("Loaded chunk:", snapshot.size);
            snapshot.forEach((doc) => {
                const data = doc.data();
                const chunk = {
                    id: data.id,
                    items: data.items,
                    ref: doc.ref,
                    visible: !startAfterId,
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
                if (oldest) loadChunk(oldest.id);
            }
        });
        observer.observe(node);
        return {
            destroy() {
                observer.disconnect();
            },
        };
    }

    onMount(()=>{
        loadChunk();
        return ()=>{
            observers.forEach((observer) => observer.disconnect());
            unsubscribers.forEach((unsub) => unsub());
        };
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

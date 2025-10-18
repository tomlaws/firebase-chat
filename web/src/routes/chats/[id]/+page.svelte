<script lang="ts">
    import { onMount } from "svelte";
    import { getAuth } from "firebase/auth";
    import InfiniteScroll from "@/components/InfiniteScroll.svelte";
    import { where } from "firebase/firestore";

    const { data } = $props();
    const id = $derived(data.id);
    const userId = getAuth().currentUser!.uid;
    const chatId = $derived(
        userId > id ? `${id}_${userId}` : `${userId}_${id}`,
    );
    let path = $derived(`chats/${chatId}/messages`);
    onMount(() => {
        const auth = getAuth();
    });
</script>

<main>
    {#key chatId}
        <InfiniteScroll
            {path}
        >
            {#snippet children(item)}
                <div class="message">
                    <p>{item.text}</p>
                    <span class="timestamp"
                        >{new Date(item.timestamp).toLocaleString()}</span
                    >
                </div>
            {/snippet}
        </InfiniteScroll>
    {/key}
</main>

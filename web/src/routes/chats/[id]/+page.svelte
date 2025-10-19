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
                <div class="flex my-4 mx-4" class:justify-end={item.uid === userId}>
                    <div class={item.uid === userId
                        ? 'bg-blue-500 text-white rounded-lg rounded-br-none py-2 px-4 max-w-[75%] break-words shadow'
                        : 'bg-gray-200 text-gray-900 rounded-lg rounded-bl-none py-2 px-4 max-w-[75%] break-words shadow'}>
                        <p class="text-sm">{item.text}</p>
                        <span class={item.uid === userId ? 'text-xs text-blue-100/90 block text-right mt-2' : 'text-xs text-gray-500 block mt-1'}>
                            {item.timestamp?.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            {/snippet}
        </InfiniteScroll>
    {/key}
</main>

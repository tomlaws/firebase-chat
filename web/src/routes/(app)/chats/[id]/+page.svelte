<script lang="ts">
    import ChunkedInfiniteScroll from "@/components/MessageList.svelte";
    import { orderBy } from "firebase/firestore";
    import { chat } from "@/chat.svelte.js";
    import { formatTimestamp } from "@/utils.js";
    import Icon from "@iconify/svelte";

    const { data } = $props();
    const id = $derived(data.id);
    const userId = $derived(chat.getUid());
    const chatId = $derived(
        userId ? (userId > id ? `${id}_${userId}` : `${userId}_${id}`) : null,
    );
    let path = $derived(`chats/${chatId}/messages`);
    function sendMessage(text: string) {
        chat.sendMessage(chatId!, id, text);
    }
</script>

<div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    {#if userId}
        {#key chatId}
            <ChunkedInfiniteScroll
                chatId={chatId!}
                orderBy={orderBy("__name__", "desc")}
            >
                {#snippet children(item)}
                    <div
                        class="flex py-2 px-4"
                        class:justify-end={item.uid === userId}
                        class:opacity-50={item.sending}
                    >
                        <div
                            class={item.uid === userId
                                ? "bg-blue-500 text-white rounded-lg rounded-br-none py-2 px-4 max-w-[75%] break-words shadow"
                                : "bg-gray-200 text-gray-900 rounded-lg rounded-bl-none py-2 px-4 max-w-[75%] break-words shadow"}
                        >
                            <p class="text-sm">{item.text}</p>
                            <span
                                class={item.uid === userId
                                    ? "text-xs text-blue-100/90 block text-right mt-2"
                                    : "text-xs text-gray-500 block mt-1"}
                            >
                                {formatTimestamp(item.timestamp)}
                            </span>
                        </div>
                    </div>
                {/snippet}
            </ChunkedInfiniteScroll>
            <div class="p-4">
                <form
                    class="flex"
                    onsubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(
                            e.target as HTMLFormElement,
                        );
                        const text = formData.get("text") as string;
                        if (text.trim() === "") return;
                        await sendMessage(text);
                        (e.target as HTMLFormElement).reset();
                    }}
                >
                    <input
                        type="text"
                        name="text"
                        placeholder="Type your message..."
                        class="flex-grow border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autocomplete="off"
                        aria-autocomplete="none"
                    />
                    <button
                        type="submit"
                        class="cursor-pointer bg-blue-500 text-white rounded-r-lg px-3 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <Icon icon="lucide:send" width="24" height="24" />
                    </button>
                </form>
            </div>
        {/key}
    {/if}
</div>

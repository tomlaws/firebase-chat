<script lang="ts">
    import { onMount } from "svelte";
    import { getAuth } from "firebase/auth";
    import InfiniteScroll from "@/components/InfiniteScroll.svelte";
    import { httpsCallable } from "firebase/functions";
    import { functions } from "@/firebase.js";

    const { data } = $props();
    const id = $derived(data.id);
    const userId = getAuth().currentUser!.uid;
    const chatId = $derived(
        userId > id ? `${id}_${userId}` : `${userId}_${id}`,
    );
    let path = $derived(`chats/${chatId}/messages`);
    function sendMessage(text: string) {
        const sendFunc = httpsCallable(functions, "sendMessage");
        sendFunc({ text, to: id })
            .then((result) => {
                console.log("Function result:", result.data);
            })
            .catch((error) => {
                console.error("Error calling function:", error);
            });
    }
</script>

<div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    {#key chatId}
        <InfiniteScroll {path}>
            {#snippet children(item)}
                <div
                    class="flex my-4 mx-4"
                    class:justify-end={item.uid === userId}
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
                            {item.timestamp?.toDate().toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>
                </div>
            {/snippet}
        </InfiniteScroll>
        <div class="p-4">
            <form
                class="flex"
                onsubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
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
                />
                <button
                    type="submit"
                    class="bg-blue-500 text-white rounded-r-lg px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Send
                </button>
            </form>
        </div>
    {/key}
</div>

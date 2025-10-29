<script lang="ts">
    import { page } from "$app/state";
    import { userLoader } from "@/cache.js";
    import { chat } from "@/chat.svelte.js";
    import { onMount, untrack } from "svelte";

    const { children, data } = $props();
    const userId = $derived(page.params.id)!;
    const AVATAR_FALLBACK = "/default-avatar.png";

    let isOnline = $state<boolean>(false);
    let lastSeen = $state<Date | null>(null);

    $effect(() => {
        const cleanup = chat.watchUserPresence(
            userId,
            (_isOnline, _lastSeenTimestamp) => {
                untrack(() => {
                    isOnline = _isOnline;
                    lastSeen = _lastSeenTimestamp
                        ? new Date(_lastSeenTimestamp)
                        : null;
                });
            },
        );

        return () => {
            cleanup();
        };
    });
</script>

<header
    class="h-16 flex items-center gap-3 px-4 py-2 shadow-xs border-b border-gray-200"
>
    {#if false}
        <img
            class="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-gray-200"
            alt={""}
            loading="lazy"
        />
    {:else}
        <div
            class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-600"
        >
            &#128100;
        </div>
    {/if}
    <div class="flex flex-col justify-center overflow-hidden">
        <div
            class="font-semibold text-base whitespace-nowrap text-ellipsis overflow-hidden h-6"
        >
            {#await userLoader.load(userId) then user}
                {user.displayName}
            {:catch}
                Loading...
            {/await}
        </div>
        <div
            class="text-sm text-gray-500 mt-0.5 whitespace-nowrap text-ellipsis overflow-hidden"
        >
            {#if isOnline}
                <span class="text-green-500">●</span> Online
            {:else if lastSeen}
                Last seen {lastSeen.toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })}
            {:else}
                Offline
            {/if}
        </div>
    </div>
</header>

{@render children?.()}

<script lang="ts">
    import { page } from "$app/state";
    import { userLoader } from "@/cache.js";

    const { children, data } = $props();
    const userId = $derived(page.params.id)!;
    const AVATAR_FALLBACK = "/default-avatar.png";
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
            last seen
        </div>
    </div>
</header>

{@render children?.()}

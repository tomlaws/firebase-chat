<script lang="ts" generics="T">
    import { onMount, type SvelteComponent } from "svelte";

    let { items, children, loadMore } = $props<{
        items: T[];
        children?: (
            item: T,
        ) => typeof SvelteComponent;
        loadMore?: (item: T) => Promise<void>;
    }>();

    function observeScrollEnd(node: Element) {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                const oldest = items[items.length - 1];
                if (oldest) {
                    loadMore(oldest);
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
        return () => {};
    });
</script>

<div class="overflow-y-auto flex-1 flex flex-col min-h-0">
    {#each items as item}
        <!-- {#each getItem(item) as transformedItem} -->
        {@render children?.(item)}
        <!-- {/each} -->
    {/each}
    {#key items.length}
        <div use:observeScrollEnd class="scroll-trigger"></div>
    {/key}
</div>

<style>
    .scroll-trigger {
        height: 1px;
    }
</style>

<script lang="ts">
    export let size = 64; // number (px) or string (e.g. "3rem")
    export let color = 'currentColor';
    export let backdrop = true;
    export let label = 'Loading...';

    $: sizeValue = typeof size === 'number' ? `${size}px` : size;
</script>

<div
    class="loader-overlay bg-gray-50 bg-opacity-75"
    aria-hidden={false}
>
    <div class="loader" role="status" aria-live="polite" aria-label={label}>
        <svg
            class="spinner"
            viewBox="0 0 50 50"
            style="width: {sizeValue}; height: {sizeValue};"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke={color}
        >
            <circle class="path" cx="25" cy="25" r="20" stroke-width="4" stroke-linecap="round"></circle>
        </svg>
        <span class="sr-only">{label}</span>
    </div>
</div>

<style>
    .loader-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        -webkit-tap-highlight-color: transparent;
        pointer-events: none; /* allow clicks through by default; change if you want blocking overlay */
    }

    .loader {
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .spinner {
        animation: spin 1s linear infinite;
        display: block;
    }

    .path {
        stroke-dasharray: 90;
        stroke-dashoffset: 0;
        transform-origin: 50% 50%;
        animation: dash 1.2s ease-in-out infinite;
    }

    @keyframes spin {
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes dash {
        0% {
            stroke-dashoffset: 90;
            stroke-dasharray: 1, 200;
            transform: rotate(0deg);
        }
        50% {
            stroke-dashoffset: 35;
            stroke-dasharray: 90, 150;
            transform: rotate(45deg);
        }
        100% {
            stroke-dashoffset: 90;
            stroke-dasharray: 90, 150;
            transform: rotate(360deg);
        }
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
        border: 0;
    }
</style>
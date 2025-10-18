<script lang="ts">
    import { onMount } from "svelte";
    import { getAuth, onAuthStateChanged } from "firebase/auth";

    const { data } = $props();
    const id: string = data.id;
    onMount(() => {
        const auth = getAuth();
    });
</script>
<main>
    <h2>Chat ID</h2>
    <p>{id}</p>
</main>

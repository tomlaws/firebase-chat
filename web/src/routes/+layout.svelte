<script lang="ts">
	import "$lib/firebase";
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { getAuth } from "firebase/auth";
    import { onMount } from "svelte";

    let { children } = $props();
    
    onMount(() => {
        const auth = getAuth();
        const sub = auth.onAuthStateChanged((user) => {
            if (!user) return;
            console.log("User is authenticated:", user.uid);
        });
        return () => sub();
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>Chat App</title>
</svelte:head>

{@render children?.()}

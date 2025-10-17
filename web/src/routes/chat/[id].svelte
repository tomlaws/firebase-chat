<script lang="ts">
    import { functions } from "@/firebase";
    import { httpsCallable } from "firebase/functions";
    import { onMount } from "svelte";
    import { getAuth, onAuthStateChanged } from "firebase/auth";
    import { goto } from "$app/navigation";

    export let id: string;

    onMount(() => {
        const auth = getAuth();
    });
</script>

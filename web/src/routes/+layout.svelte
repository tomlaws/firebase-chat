<script lang="ts">
    import "$lib/firebase";
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { getAuth, getIdTokenResult, type User } from "firebase/auth";
    import { onMount } from "svelte";
    import FullscreenLoader from "@/components/FullscreenLoader.svelte";
    import { setUserContext } from "@/context";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";

    let { children } = $props();
    let loading = $state(true);

    let user = $state<User | any>(null);
    let claims = $state<Record<string, any>>({});
    setUserContext({ user: () => user, claims: () => claims });

    onMount(() => {
        const auth = getAuth();
        const sub = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                console.log("User logged in:", firebaseUser.uid);
                const { claims } = await getIdTokenResult(firebaseUser);
                user = firebaseUser;
                if (
                    typeof claims.username !== "string" ||
                    !claims.username.length
                ) {
                    if (page.url.pathname !== "/onboard") {
                        goto("/onboard");
                    }
                } else {
                    if (page.url.pathname === "/onboard") {
                        goto("/");
                    }
                }
            } else {
                if (page.url.pathname !== "/login") {
                    goto("/login");
                }
            }
            loading = false;
        });
        return () => sub();
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>Chat App</title>
</svelte:head>

{#if loading}
    <FullscreenLoader />
{:else}
    {@render children?.()}
{/if}

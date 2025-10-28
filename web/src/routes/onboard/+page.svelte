<script lang="ts">
    import { goto } from "$app/navigation";
    import { functions } from "@/firebase";
    import Icon from "@iconify/svelte";
    import { getAuth, getIdTokenResult } from "firebase/auth";
    import { httpsCallable } from "firebase/functions";

    let username = $state("");
    let displayName = $state("");
    let submitted = $state(false);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        submitted = true;
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            console.error("No authenticated user found.");
            submitted = false;
            return;
        }
        const onboardUser = httpsCallable(functions, "onboardUser");
        const result = await onboardUser({ username, displayName });
        const { claims } = await getIdTokenResult(auth.currentUser, true);
        console.log("Onboarding successful:", result.data, "Claims:", claims);
        submitted = false;
        // redirect to main app or dashboard
        goto("/");
    }
</script>

<!-- <div
    class="min-h-screen flex items-center justify-center text-slate-100 p-8 bg-gradient-to-r from-[#0d2c4d] to-[#0f506e]"
> -->
<div
    class="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900"
>
    <!-- <div
        class="relative w-full max-w-lg bg-white/3 border border-white/6 rounded-xl p-8 shadow-[0_8px_30px_rgba(2,6,23,0.2)] backdrop-blur-sm"
    > -->
    <div
        class="relative w-full max-w-lg bg-white border border-white/6 rounded-xl p-8 shadow-lg backdrop-blur-sm"
    >
        <!-- small orb ornament -->
        <div
            aria-hidden="true"
            class="pointer-events-none absolute -right-10 -top-10 w-30 h-30 rounded-full"
            style="width:120px;height:120px;background:radial-gradient(circle at 30% 30%, rgba(60,140,255,0.18), rgba(2,6,23,0) 45%); filter: blur(18px);"
        />

        <div class="flex items-center gap-3 mb-6">
            <div
                class="logo w-11 h-11 rounded-lg bg-white/4 flex items-center justify-center"
                aria-hidden="true"
            >
                <Icon icon="lucide:user" width="36" height="36" />
            </div>
            <div>
                <div
                    id="onboard-title"
                    class="text-lg font-semibold leading-none"
                >
                    Welcome
                </div>
                <div class="text-sm text-slate-700 dark:text-slate-200">
                    Create your username and display name to get started.
                </div>
            </div>
        </div>

        <!-- {#if submitted}
            <div
                class="inline-flex items-center gap-2 px-3 py-2 bg-emerald-700/10 rounded-full font-semibold text-sm mb-3"
                role="status"
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    class="stroke-emerald-200"
                >
                    <path
                        d="M20 6L9 17l-5-5"
                        stroke="#c6ffd8"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
                Saved
            </div>
        {/if} -->

        <form
            onsubmit={handleSubmit}
            aria-label="Onboarding form"
            class="grid gap-5"
        >
            <!-- Username field -->
            <!-- Floating label: active when focused or has value -->
            <div>
                <label
                    for="username"
                    class="transition-all duration-160 text-sm text-slate-800 dark:text-slate-100"
                >
                    Username
                </label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder=" "
                    oninput={() => (username = username.toLowerCase())}
                    bind:value={username}
                    autocomplete="off"
                    aria-autocomplete="none"
                    required
                    maxlength="20"
                    minlength="3"
                    class="mt-2 w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <div
                    class="text-xs text-slate-600/60 dark:text-slate-200/60 mt-2"
                >
                    Choose a unique username — 3 to 20 characters
                </div>
            </div>

            <!-- Display name field -->
            <div>
                <label
                    for="displayName"
                    class="transition-all duration-160 text-sm text-slate-800 dark:text-slate-100"
                >
                    Display Name
                </label>
                <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder=" "
                    bind:value={displayName}
                    autocomplete="off"
                    aria-autocomplete="none"
                    required
                    maxlength="30"
                    minlength="1"
                    class="mt-2 w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <div
                    class="text-xs text-slate-600/60 dark:text-slate-200/60 mt-2"
                >
                    How others will see you
                </div>
            </div>

            <div class="flex items-center gap-3 mt-1">
                <button
                    class="flex-1 rounded-lg px-4 py-3 font-semibold text-white bg-gradient-to-r bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    type="submit"
                    disabled={!username || !displayName}
                >
                    {#if submitted}Saving...{:else}Get started{/if}
                </button>
            </div>
        </form>
    </div>
</div>

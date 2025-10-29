<script lang="ts">
    import { onMount } from "svelte";
    import {
        getAuth,
        signInWithPhoneNumber,
        RecaptchaVerifier,
        type ConfirmationResult,
    } from "firebase/auth";
    import { firebaseApp } from "$lib/firebase";

    let phoneNumber = $state("");
    let verificationCode = $state("");
    let error = $state("");
    let loading = $state(false);
    let step = $state<"phone" | "verification">("phone");
    let confirmationResult: ConfirmationResult | null = null;
    let recaptchaVerifier: RecaptchaVerifier | null = null;

    onMount(() => {
        const auth = getAuth(firebaseApp);
        // Initialize reCAPTCHA
        setupRecaptcha();
        return () => {
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
            }
        };
    });

    function setupRecaptcha() {
        const auth = getAuth(firebaseApp);

        recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "normal",
            callback: () => {
                // reCAPTCHA solved, allow signInWithPhoneNumber
            },
            "expired-callback": () => {
                error = "reCAPTCHA expired. Please try again.";
            },
        });
    }

    async function sendVerificationCode() {
        if (!phoneNumber.trim()) {
            error = "Please enter a phone number";
            return;
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(phoneNumber)) {
            error = "Please enter a valid phone number";
            return;
        }

        error = "";
        loading = true;

        try {
            const auth = getAuth(firebaseApp);

            if (!recaptchaVerifier) {
                setupRecaptcha();
            }

            confirmationResult = await signInWithPhoneNumber(
                auth,
                phoneNumber,
                recaptchaVerifier!,
            );
            step = "verification";
        } catch (e: any) {
            console.error("Error sending verification code:", e);
            error =
                "Failed to send verification code: " +
                (e.message || "Unknown error");

            // Reset reCAPTCHA on error
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                setupRecaptcha();
            }
        } finally {
            loading = false;
        }
    }

    async function verifyCode() {
        if (!verificationCode.trim()) {
            error = "Please enter the verification code";
            return;
        }

        if (!confirmationResult) {
            error = "No verification code was sent. Please try again.";
            return;
        }

        error = "";
        loading = true;

        try {
            await confirmationResult.confirm(verificationCode);
        } catch (e: any) {
            console.error("Error verifying code:", e);
            error = "Invalid verification code. Please try again.";
        } finally {
            loading = false;
        }
    }

    function goBack() {
        step = "phone";
        verificationCode = "";
        error = "";

        // Reset reCAPTCHA
        if (recaptchaVerifier) {
            recaptchaVerifier.clear();
            setupRecaptcha();
        }
    }

    function handlePhoneSubmit(event: Event) {
        event.preventDefault();
        sendVerificationCode();
    }

    function handleCodeSubmit(event: Event) {
        event.preventDefault();
        verifyCode();
    }
</script>

<svelte:head>
    <title>Sign In - Firebase Chat</title>
</svelte:head>

<div
    class="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900"
>
    <div
        class="w-full max-w-lg bg-white border border-white/6 rounded-xl p-8 shadow-lg backdrop-blur-sm"
    >
        <h1 class="text-center text-gray-800 mb-2 text-2xl font-semibold">
            Welcome!
        </h1>
        <p class="text-center text-gray-500 mb-6 text-sm">
            Sign in with your phone number
        </p>

        {#if step === "phone"}
            <form on:submit={handlePhoneSubmit} class="flex flex-col space-y-6">
                <div class="flex flex-col space-y-2">
                    <label for="phone" class="font-medium text-gray-700 text-sm"
                        >Phone Number</label
                    >
                    <input
                        id="phone"
                        type="tel"
                        bind:value={phoneNumber}
                        placeholder="+1 234 567 8900"
                        class="p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={loading}
                        required
                        autocomplete="off"
                        aria-autocomplete="none"
                    />
                    <small class="text-gray-500 text-xs"
                        >Include country code (e.g., +1 for US)</small
                    >
                </div>

                <div
                    id="recaptcha-container"
                    class="my-4 flex justify-center"
                ></div>

                <button
                    type="submit"
                    class="px-6 py-3 rounded-lg text-white cursor-pointer bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    disabled={loading}
                >
                    {#if loading}
                        Sending...
                    {:else}
                        Send Verification Code
                    {/if}
                </button>
            </form>
        {:else if step === "verification"}
            <form on:submit={handleCodeSubmit} class="flex flex-col space-y-6">
                <div class="flex flex-col space-y-2">
                    <label for="code" class="font-medium text-gray-700 text-sm"
                        >Verification Code</label
                    >
                    <input
                        id="code"
                        type="text"
                        bind:value={verificationCode}
                        placeholder="123456"
                        class="p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={loading}
                        maxlength="6"
                        required
                        autocomplete="off"
                        aria-autocomplete="none"
                    />
                    <small class="text-gray-500 text-xs"
                        >Enter the 6-digit code sent to {phoneNumber}</small
                    >
                </div>

                <div class="flex gap-4">
                    <button
                        type="button"
                        class="flex-1 px-6 py-3 rounded-lg bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        on:click={goBack}
                        disabled={loading}
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        class="flex-2 px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                        disabled={loading}
                    >
                        {#if loading}
                            Verifying...
                        {:else}
                            Verify & Sign In
                        {/if}
                    </button>
                </div>
            </form>
        {/if}

        {#if error}
            <div
                class="bg-red-50 text-red-700 p-3 rounded-lg border-red-600 text-sm mt-4"
                role="alert"
            >
                {error}
            </div>
        {/if}
    </div>
</div>

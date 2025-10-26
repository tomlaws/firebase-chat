<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { getAuth, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
    import { firebaseApp } from '$lib/firebase';

    let phoneNumber = $state('');
    let verificationCode = $state('');
    let error = $state('');
    let loading = $state(false);
    let step = $state<'phone' | 'verification'>('phone');
    let confirmationResult: ConfirmationResult | null = null;
    let recaptchaVerifier: RecaptchaVerifier | null = null;

    onMount(() => {
        const auth = getAuth(firebaseApp);
        
        // Check if user is already logged in
        if (auth.currentUser) {
            goto('/');
            return;
        }

       const unsub = auth.onAuthStateChanged((user) => {
            if (user) {
                goto('/');
            }
        });

        // Initialize reCAPTCHA
        setupRecaptcha();
        return () => {
            unsub();
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
            }
        };
    });

    function setupRecaptcha() {
        const auth = getAuth(firebaseApp);
        
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'normal',
            callback: () => {
                // reCAPTCHA solved, allow signInWithPhoneNumber
            },
            'expired-callback': () => {
                error = 'reCAPTCHA expired. Please try again.';
            }
        });
    }

    async function sendVerificationCode() {
        if (!phoneNumber.trim()) {
            error = 'Please enter a phone number';
            return;
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(phoneNumber)) {
            error = 'Please enter a valid phone number';
            return;
        }

        error = '';
        loading = true;

        try {
            const auth = getAuth(firebaseApp);
            
            if (!recaptchaVerifier) {
                setupRecaptcha();
            }

            confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier!);
            step = 'verification';
        } catch (e: any) {
            console.error('Error sending verification code:', e);
            error = 'Failed to send verification code: ' + (e.message || 'Unknown error');
            
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
            error = 'Please enter the verification code';
            return;
        }

        if (!confirmationResult) {
            error = 'No verification code was sent. Please try again.';
            return;
        }

        error = '';
        loading = true;

        try {
            await confirmationResult.confirm(verificationCode);
            goto('/');
        } catch (e: any) {
            console.error('Error verifying code:', e);
            error = 'Invalid verification code. Please try again.';
        } finally {
            loading = false;
        }
    }

    function goBack() {
        step = 'phone';
        verificationCode = '';
        error = '';
        
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

<div class="login-container">
    <div class="login-card">
        <h1>Welcome to Firebase Chat</h1>
        <p class="subtitle">Sign in with your phone number</p>
        
        {#if step === 'phone'}
            <form onsubmit={handlePhoneSubmit} class="form">
                <div class="input-group">
                    <label for="phone">Phone Number</label>
                    <input 
                        id="phone"
                        type="tel" 
                        bind:value={phoneNumber} 
                        placeholder="+1 234 567 8900" 
                        disabled={loading}
                        required 
                    />
                    <small>Include country code (e.g., +1 for US)</small>
                </div>
                
                <div id="recaptcha-container"></div>
                
                <button type="submit" class="btn-primary" disabled={loading}>
                    {#if loading}
                        Sending...
                    {:else}
                        Send Verification Code
                    {/if}
                </button>
            </form>
        {:else if step === 'verification'}
            <form onsubmit={handleCodeSubmit} class="form">
                <div class="input-group">
                    <label for="code">Verification Code</label>
                    <input 
                        id="code"
                        type="text" 
                        bind:value={verificationCode} 
                        placeholder="123456" 
                        disabled={loading}
                        maxlength="6"
                        required 
                    />
                    <small>Enter the 6-digit code sent to {phoneNumber}</small>
                </div>
                
                <div class="button-group">
                    <button type="button" class="btn-secondary" onclick={goBack} disabled={loading}>
                        Back
                    </button>
                    <button type="submit" class="btn-primary" disabled={loading}>
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
            <div class="error" role="alert">
                {error}
            </div>
        {/if}
    </div>
</div>

<style>
    .login-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .login-card {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
    }
    
    h1 {
        text-align: center;
        color: #333;
        margin-bottom: 0.5rem;
        font-size: 1.75rem;
        font-weight: 600;
    }
    
    .subtitle {
        text-align: center;
        color: #666;
        margin-bottom: 2rem;
        font-size: 0.9rem;
    }
    
    .form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    label {
        font-weight: 500;
        color: #333;
        font-size: 0.9rem;
    }
    
    input {
        padding: 0.75rem;
        border: 2px solid #e1e5e9;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.2s ease;
    }
    
    input:focus {
        outline: none;
        border-color: #667eea;
    }
    
    input:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }
    
    small {
        color: #666;
        font-size: 0.8rem;
    }
    
    .btn-primary, .btn-secondary {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
    }
    
    .btn-primary {
        background: #667eea;
        color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
        background: #5a6fd8;
        transform: translateY(-1px);
    }
    
    .btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
    }
    
    .btn-secondary {
        background: #f8f9fa;
        color: #333;
        border: 2px solid #e1e5e9;
    }
    
    .btn-secondary:hover:not(:disabled) {
        background: #e9ecef;
    }
    
    .button-group {
        display: flex;
        gap: 1rem;
    }
    
    .button-group .btn-secondary {
        flex: 1;
    }
    
    .button-group .btn-primary {
        flex: 2;
    }
    
    .error {
        background: #fee;
        color: #c33;
        padding: 0.75rem;
        border-radius: 8px;
        border-left: 4px solid #c33;
        font-size: 0.9rem;
    }
    
    :global(#recaptcha-container) {
        margin: 1rem 0;
        display: flex;
        justify-content: center;
    }
    
    @media (max-width: 480px) {
        .login-card {
            padding: 1.5rem;
        }
        
        h1 {
            font-size: 1.5rem;
        }
        
        .button-group {
            flex-direction: column;
        }
    }
</style>
<script lang="ts">
    import { functions } from "@/firebase";
    import { httpsCallable } from "firebase/functions";

    function send() {
        // call firebase function
        const sendFunc = httpsCallable(functions, "sendMessage");
        sendFunc({ text: "Hello from SvelteKit!", to: "user2" })
            .then((result) => {
                console.log("Function result:", result.data);
            })
            .catch((error) => {
                console.error("Error calling function:", error);
            });
    }
</script>

<button onclick={() => send()}>Go to Login</button>

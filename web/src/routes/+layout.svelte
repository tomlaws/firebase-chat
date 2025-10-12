<script lang="ts">
	import '../app.css';
	import '$lib/firebase';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAuth, onAuthStateChanged } from 'firebase/auth';

	let { children } = $props();

	onMount(() => {
		const auth = getAuth();
		onAuthStateChanged(auth, (user) => {
			if (!user) {
				goto('/login');
		 }
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

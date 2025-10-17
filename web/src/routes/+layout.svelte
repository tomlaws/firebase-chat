<script lang="ts">
	import "../app.css";
	import "$lib/firebase";
	import favicon from "$lib/assets/favicon.svg";
	import { onMount } from "svelte";
	import { getAuth } from "firebase/auth";
	import InfiniteScroll from "@/components/InfiniteScroll.svelte";
	import { getDoc, where } from "firebase/firestore";

	let { children } = $props();
	let loading = $state(true);

	onMount(() => {
		const auth = getAuth();
		const sub = auth.onAuthStateChanged((user) => {
			loading = false;
		});
		return () => sub();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center min-h-screen">
		<div class="loader">Loading...</div>
	</div>
{:else if getAuth().currentUser}
	<div class="min-h-screen bg-gray-100">
		<div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
			<div
				class="bg-white shadow rounded-lg overflow-hidden flex h-[calc(100vh-96px)]"
			>
				<!-- Left: conversation list -->
				<aside
					class="w-80 border-r border-gray-200 flex flex-col bg-white"
				>
					<div class="p-4">
						<div class="flex items-center gap-3">
							<h2 class="text-lg font-semibold">Chats</h2>
							<button
								class="ml-auto text-sm text-blue-600 hover:underline"
								>New</button
							>
						</div>
						<div class="mt-3">
							<input
								type="search"
								placeholder="Search conversations"
								class="w-full px-3 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
							/>
						</div>
					</div>

					<nav class="px-2 py-2 overflow-auto flex-1">
						<ul class="space-y-1">
							<InfiniteScroll
								path="chats"
								queryConstraints={[
									where(
										"members",
										"array-contains",
										getAuth().currentUser?.uid,
									),
								]}
							>
								{#snippet children(item)}
									<li>
										<button
											class="w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 flex items-center gap-3"
										>
											{#if item.avatarUrl}
												<img
													src={item.avatarUrl}
													alt={item.name}
													class="w-10 h-10 rounded-full object-cover"
												/>
											{:else}
												<div
													class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-600"
												>
													{item.name
														.charAt(0)
														.toUpperCase()}
												</div>
											{/if}
											<div class="flex-1 min-w-0">
												<div
													class="flex justify-between items-center"
												>
													<span
														class="font-medium truncate"
														>{item.name}</span
													>
													<span
														class="text-xs text-gray-400"
														>{item.lastMessageTime}</span
													>
												</div>
												<p
													class="text-sm text-gray-500 truncate"
												>
													{item.lastMessagePreview}
												</p>
											</div>
										</button>
									</li>
								{/snippet}
							</InfiniteScroll>
							<li>
								<button
									class="w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 flex items-center gap-3"
								>
									<img
										src="/avatar1.png"
										alt="Alice"
										class="w-10 h-10 rounded-full object-cover"
									/>
									<div class="flex-1 min-w-0">
										<div
											class="flex justify-between items-center"
										>
											<span class="font-medium truncate"
												>Alice</span
											>
											<span class="text-xs text-gray-400"
												>2:34 PM</span
											>
										</div>
										<p
											class="text-sm text-gray-500 truncate"
										>
											Hey — are we still on for today?
										</p>
									</div>
								</button>
							</li>

							<li>
								<button
									class="w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 flex items-center gap-3"
								>
									<div
										class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-600"
									>
										B
									</div>
									<div class="flex-1 min-w-0">
										<div
											class="flex justify-between items-center"
										>
											<span class="font-medium truncate"
												>Bob</span
											>
											<span class="text-xs text-gray-400"
												>Yesterday</span
											>
										</div>
										<p
											class="text-sm text-gray-500 truncate"
										>
											Sent a file
										</p>
									</div>
								</button>
							</li>

							<li>
								<button
									class="w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 flex items-center gap-3"
								>
									<div
										class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center"
									>
										C
									</div>
									<div class="flex-1 min-w-0">
										<div
											class="flex justify-between items-center"
										>
											<span class="font-medium truncate"
												>Charlie</span
											>
											<span class="text-xs text-gray-400"
												>Mon</span
											>
										</div>
										<p
											class="text-sm text-gray-500 truncate"
										>
											Typing…
										</p>
									</div>
								</button>
							</li>
							<!-- add more conversation items as needed -->
						</ul>
					</nav>
				</aside>

				<!-- Right: render children (chat content) -->
				<main class="flex-1 bg-white">
					<div class="h-full">
						{@render children?.()}
					</div>
				</main>
			</div>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}

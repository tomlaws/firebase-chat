<script lang="ts">
	import "$lib/firebase";
	import { onMount } from "svelte";
	import { getAuth } from "firebase/auth";
	import { page } from "$app/state";
	import InfiniteScroll from "@/components/InfiniteScroll.svelte";
	import { userLoader } from "@/cache";
	import { chat } from "@/chat.svelte";
	import { formatTimestamp } from "@/utils";
	import Icon from "@iconify/svelte";
    import Loader from "@/components/Loader.svelte";

	let { children } = $props();
	let loading = $state(true);
	let searchQuery = $state<String>();
	let unsub: (() => void) | null = null;
	onMount(() => {
		const auth = getAuth();
		const sub = auth.onAuthStateChanged((user) => {
			if (unsub) unsub();
			if (!user) {
                window.location.href = "/login";
                return;
			}
			console.log("Initializing chat for user:", user.uid);
			unsub = chat.initializeChat(user.uid);
			loading = false;
		});
		return () => sub();
	});
</script>

{#if loading}
	<Loader />
{:else if chat.getUid()}
	<div class="min-h-screen bg-gray-100">
		<div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
			<div
				class="bg-white shadow rounded-lg overflow-hidden flex h-[calc(100vh-96px)]"
			>
				<!-- Left: conversation list -->
				<aside
					class="w-80 border-r border-gray-200 flex flex-col bg-white"
				>
					<div
						class="h-16 px-4 flex flex-col justify-center shadow-xs border-b border-gray-200"
					>
						<div class="flex items-center gap-3">
							{#if searchQuery !== undefined}
								<button onclick={() => (searchQuery = undefined)} class="p-2 cursor-pointer rounded-md hover:bg-gray-100">
									<Icon icon="mdi:arrow-left" class="w-5 h-5" />
								</button>
								<input
									type="text"
									name="search"
									bind:value={searchQuery}
									placeholder="Search user"
									autofocus
									autocomplete="off"
									aria-autocomplete="none"
									class="ml-1 flex-1 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
								/>
							{:else}
								<h2 class="text-lg font-semibold">Chats</h2>
								<button
									onclick={() => (searchQuery = "")}
									class="cursor-pointer ml-auto text-sm text-blue-600 hover:underline px-2 py-2 rounded-full hover:bg-blue-50"
								>
									<Icon
										icon="uil:plus"
										width="24"
										height="24"
									/>
								</button>
							{/if}
						</div>
						<!-- <div class="mt-3">
							<input
								type="search"
								placeholder="Search conversations"
								class="w-full px-3 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
							/>
						</div> -->
					</div>

					<nav class="px-2 py-2 overflow-auto flex-1">
						<ul class="space-y-1">
							<InfiniteScroll
								items={chat.conversations}
								loadMore={chat.getMoreConversations}
							>
								{#snippet children(item)}
									{@const data = item.data()}
									{@const partnerId = data.members.find(
										(uid: string) =>
											uid !== getAuth().currentUser?.uid,
									)}
									<li>
										<a
											href={`/chats/${partnerId}`}
											class={`w-full text-left px-3 py-3 rounded-md flex items-center gap-3 ${
												page?.url?.pathname ===
												`/chats/${partnerId}`
													? "bg-blue-50"
													: "hover:bg-gray-50"
											}`}
											onclick={(e) => {
												searchQuery = undefined;
											}}
											aria-current={page?.url
												?.pathname ===
											`/chats/${partnerId}`
												? "page"
												: undefined}
										>
											{#if data.avatarUrl}
												<img
													src={data.avatarUrl}
													alt={data.displayName}
													class="w-10 h-10 rounded-full object-cover"
												/>
											{:else}
												<div
													class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-600"
												>
													&#128100;
												</div>
											{/if}
											<div class="flex-1 min-w-0">
												<div
													class="flex justify-between items-center"
												>
													<span
														class="font-medium truncate h-6"
													>
														{#await userLoader.load(partnerId) then user}
															{user.displayName}
														{:catch}
															Loading...
														{/await}
													</span>
													<span
														class="text-xs text-gray-400"
														>{data.recentMessages
															?.length
															? formatTimestamp(
																	data
																		.recentMessages[
																		data
																			.recentMessages
																			.length -
																			1
																	].timestamp,
																)
															: ""}
													</span>
												</div>
												<p
													class="text-sm text-gray-500 truncate"
												>
													{data.recentMessages?.[
														data.recentMessages
															.length - 1
													]?.text ?? ""}
												</p>
											</div>
										</a>
									</li>
								{/snippet}
							</InfiniteScroll>
							<!-- add more conversation items as needed -->
						</ul>
					</nav>
				</aside>

				<!-- Right: render children (chat content) -->
				<main class="flex-1 flex flex-col bg-white relative">
					{@render children?.()}
				</main>
			</div>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}

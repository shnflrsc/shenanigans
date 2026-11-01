<script lang="ts">
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { runAction } from '#lib/admin/actions.js';
	import ConfirmDialog from '#lib/components/admin/confirm-dialog.svelte';
	import EmptyState from '#lib/components/admin/empty-state.svelte';
	import StatusBadge from '#lib/components/admin/status-badge.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { formatDate } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tabs = [
		{ id: 'all', label: 'All' },
		{ id: 'published', label: 'Published' },
		{ id: 'draft', label: 'Drafts' }
	] as const;

	const tabHref = (id: string) =>
		id === 'all' ? resolve('/admin/(app)/posts') : resolve('/admin/(app)/posts') + '?status=' + id;

	let deleting = $state<{ id: string; title: string } | null>(null);
	let confirmOpen = $state(false);
</script>

<svelte:head><title>Posts · Admin</title></svelte:head>

<div class="flex items-center justify-between gap-4">
	<h1 class="text-[26px] leading-[34px] font-semibold tracking-[-0.02em]">Posts</h1>
	<Button href={resolve('/admin/(app)/posts/[id]', { id: 'new' })}>
		<PlusIcon aria-hidden="true" />New post
	</Button>
</div>

<div
	role="tablist"
	aria-label="Filter posts by status"
	class="inline-flex w-fit gap-0.5 rounded-lg border border-line bg-paper-soft p-0.5"
>
	<!-- eslint-disable svelte/no-navigation-without-resolve -- hrefs are built from resolve() in tabHref -->
	{#each tabs as tab (tab.id)}
		<a
			role="tab"
			aria-selected={data.status === tab.id}
			href={tabHref(tab.id)}
			class="inline-flex h-8 items-center rounded-md px-3 text-ui text-ink-subtle aria-selected:bg-paper-raised aria-selected:text-ink aria-selected:shadow-sm"
			>{tab.label}</a
		>
	{/each}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</div>

{#if data.posts.length === 0}
	<EmptyState
		icon={FileTextIcon}
		title={data.status === 'all'
			? 'No posts yet'
			: `No ${data.status === 'draft' ? 'draft' : 'published'} posts`}
	>
		<Button href={resolve('/admin/(app)/posts/[id]', { id: 'new' })}>
			<PlusIcon aria-hidden="true" />New post
		</Button>
	</EmptyState>
{:else}
	<div class="overflow-hidden rounded-lg border border-line">
		<table class="w-full text-left">
			<thead class="bg-paper-soft">
				<tr class="text-caption text-ink-muted">
					<th scope="col" class="px-4 py-2.5 font-normal">Title</th>
					<th scope="col" class="px-4 py-2.5 font-normal max-[719px]:hidden">Status</th>
					<th scope="col" class="px-4 py-2.5 font-normal max-[719px]:hidden">Updated</th>
					<th scope="col" class="w-14 px-4 py-2.5"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.posts as post (post.id)}
					<tr class="border-t border-line hover:bg-fill-hover">
						<td class="px-4 py-3">
							<a
								href={resolve('/admin/(app)/posts/[id]', { id: post.id })}
								class="text-[15px] leading-[22px] font-semibold">{post.title}</a
							>
							<div class="text-caption text-ink-subtle normal-case">{post.slug}</div>
							<div class="mt-1.5 flex items-center gap-2 min-[720px]:hidden">
								<StatusBadge status={post.status} />
								<span class="text-caption text-ink-subtle">{formatDate(post.updatedAt)}</span>
							</div>
						</td>
						<td class="px-4 py-3 max-[719px]:hidden"><StatusBadge status={post.status} /></td>
						<td class="px-4 py-3 text-caption text-ink-subtle max-[719px]:hidden"
							>{formatDate(post.updatedAt)}</td
						>
						<td class="px-2 py-2 text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="ghost"
											size="icon"
											aria-label={`Actions for ${post.title}`}
										>
											<EllipsisIcon aria-hidden="true" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item
										onSelect={() => goto(resolve('/admin/(app)/posts/[id]', { id: post.id }))}
										>Edit</DropdownMenu.Item
									>
									<DropdownMenu.Item
										onSelect={() =>
											runAction(
												'setStatus',
												{
													id: post.id,
													status: post.status === 'published' ? 'draft' : 'published'
												},
												{
													success: post.status === 'published' ? 'Unpublished.' : 'Published.'
												}
											)}
									>
										{post.status === 'published' ? 'Unpublish' : 'Publish'}
									</DropdownMenu.Item>
									<DropdownMenu.Item
										onSelect={() => {
											deleting = { id: post.id, title: post.title };
											confirmOpen = true;
										}}>Delete</DropdownMenu.Item
									>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<ConfirmDialog
	bind:open={confirmOpen}
	title="Delete this post?"
	confirmLabel="Delete post"
	onconfirm={async () => {
		if (deleting) await runAction('delete', { id: deleting.id }, { success: 'Post deleted.' });
	}}
>
	“{deleting?.title}” will be removed from the site. This cannot be undone.
</ConfirmDialog>

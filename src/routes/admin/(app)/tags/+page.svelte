<script lang="ts">
	import TagIcon from '@lucide/svelte/icons/tag';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { runAction } from '#lib/admin/actions.js';
	import ConfirmDialog from '#lib/components/admin/confirm-dialog.svelte';
	import EmptyState from '#lib/components/admin/empty-state.svelte';
	import Field from '#lib/components/admin/field.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { slugify } from '#lib/slug.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let name = $state('');
	let renaming = $state<string | null>(null);
	let renameValue = $state('');
	let renameError = $state('');
	let deleting = $state<{ id: string; name: string; posts: number; projects: number } | null>(null);
	let confirmOpen = $state(false);

	const createError = $derived(
		form && 'field' in form && form.field === 'name' ? form.message : undefined
	);

	async function saveRename(id: string) {
		const result = await runAction(
			'rename',
			{ id, name: renameValue },
			{ success: 'Tag renamed.' }
		);
		if (result.ok) renaming = null;
		else renameError = result.message ?? '';
	}
</script>

<svelte:head><title>Tags · Admin</title></svelte:head>

<h1 class="text-[26px] leading-[34px] font-semibold tracking-[-0.02em]">Tags</h1>

<form
	method="POST"
	action="?/create"
	class="flex max-w-[520px] flex-col gap-2"
	use:enhance={() =>
		async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Tag created.');
				name = '';
			}
			await update({ reset: false });
		}}
>
	<div class="flex items-start gap-2">
		<div class="flex-1">
			<Field id="new-tag" label="New tag" error={createError}>
				{#snippet children({ describedby, invalid })}
					<input
						id="new-tag"
						name="name"
						type="text"
						bind:value={name}
						aria-describedby={describedby}
						aria-invalid={invalid}
						class="h-9 w-full rounded-md border border-line-strong bg-paper px-3 text-ui {invalid
							? 'ring-2 ring-ink'
							: ''}"
					/>
				{/snippet}
			</Field>
		</div>
		<Button type="submit" variant="secondary" class="mt-[26px]">Create tag</Button>
	</div>
</form>

{#if data.tags.length === 0}
	<EmptyState icon={TagIcon} title="No tags yet" />
{:else}
	<div class="overflow-x-auto rounded-lg border border-line">
		<table class="w-full min-w-[560px] text-left">
			<thead class="bg-paper-soft">
				<tr class="text-caption text-ink-muted">
					<th scope="col" class="px-4 py-2.5 font-normal">Name</th>
					<th scope="col" class="px-4 py-2.5 font-normal">Slug</th>
					<th scope="col" class="px-4 py-2.5 font-normal">Posts</th>
					<th scope="col" class="px-4 py-2.5 font-normal">Projects</th>
					<th scope="col" class="px-4 py-2.5"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.tags as tag (tag.id)}
					<tr class="border-t border-line hover:bg-fill-hover">
						{#if renaming === tag.id}
							<td class="px-4 py-2" colspan="3">
								<form
									class="flex flex-wrap items-center gap-2"
									onsubmit={(event) => {
										event.preventDefault();
										void saveRename(tag.id);
									}}
								>
									<input
										aria-label={`New name for ${tag.name}`}
										bind:value={renameValue}
										class="h-9 w-56 rounded-md border border-line-strong bg-paper px-3 text-ui {renameError
											? 'ring-2 ring-ink'
											: ''}"
									/>
									<span class="text-caption text-ink-subtle normal-case"
										>{slugify(renameValue) || '—'}</span
									>
									{#if renameError}<span role="alert" class="text-[13px] font-medium"
											>{renameError}</span
										>{/if}
									<Button type="submit" size="sm">Save</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => {
											renaming = null;
											renameError = '';
										}}>Cancel</Button
									>
								</form>
							</td>
							<td class="px-4 py-3"></td>
						{:else}
							<td class="px-4 py-3 text-[15px] font-semibold">{tag.name}</td>
							<td class="px-4 py-3 text-caption text-ink-subtle normal-case">{tag.slug}</td>
							<td class="px-4 py-3 text-caption text-ink-subtle">{tag.posts}</td>
							<td class="px-4 py-3 text-caption text-ink-subtle">{tag.projects}</td>
							<td class="px-4 py-2 text-right whitespace-nowrap">
								<Button
									variant="ghost"
									size="sm"
									aria-label={`Rename ${tag.name}`}
									onclick={() => {
										renaming = tag.id;
										renameValue = tag.name;
										renameError = '';
									}}>Rename</Button
								>
								<Button
									variant="ghost"
									size="sm"
									aria-label={`Delete ${tag.name}`}
									onclick={() => {
										deleting = tag;
										confirmOpen = true;
									}}>Delete</Button
								>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<ConfirmDialog
	bind:open={confirmOpen}
	title={`Delete the tag “${deleting?.name ?? ''}”?`}
	confirmLabel="Delete tag"
	onconfirm={async () => {
		if (deleting) await runAction('delete', { id: deleting.id }, { success: 'Tag deleted.' });
	}}
>
	It is used by {deleting?.posts ?? 0}
	{deleting?.posts === 1 ? 'post' : 'posts'} and {deleting?.projects ?? 0}
	{deleting?.projects === 1 ? 'project' : 'projects'}. The posts and projects stay untouched; only
	the tag is removed from them.
</ConfirmDialog>

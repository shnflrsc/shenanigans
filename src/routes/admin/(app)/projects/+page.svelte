<script lang="ts">
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import StarIcon from '@lucide/svelte/icons/star';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { runAction } from '#lib/admin/actions.js';
	import ConfirmDialog from '#lib/components/admin/confirm-dialog.svelte';
	import EmptyState from '#lib/components/admin/empty-state.svelte';
	import StatusBadge from '#lib/components/admin/status-badge.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tabs = [
		{ id: 'all', label: 'All' },
		{ id: 'published', label: 'Published' },
		{ id: 'draft', label: 'Drafts' }
	] as const;
	const tabHref = (id: string) =>
		id === 'all'
			? resolve('/admin/(app)/projects')
			: resolve('/admin/(app)/projects') + '?status=' + id;

	let deleting = $state<{ id: string; title: string } | null>(null);
	let confirmOpen = $state(false);
	let flash = $state<string | null>(null);
	const loading = $derived(navigating.to !== null);

	async function feature(project: { id: string; title: string }, on: boolean) {
		const result = await runAction('setFeatured', { id: project.id, featured: String(on) });
		if (!result.ok) return;
		flash = project.id;
		setTimeout(() => (flash = null), 900);
		const previous = (
			result.data as { previous?: { id: string; title: string } | null } | undefined
		)?.previous;
		if (on) {
			toast.success(`${project.title} is now featured.`, {
				description: previous ? `${previous.title} is no longer featured.` : undefined,
				action: {
					label: 'Undo',
					onClick: async () => {
						if (previous) await runAction('setFeatured', { id: previous.id, featured: 'true' });
						else await runAction('setFeatured', { id: project.id, featured: 'false' });
					}
				}
			});
		} else {
			toast.success(`${project.title} is no longer featured.`);
		}
	}
</script>

<svelte:head><title>Projects · Admin</title></svelte:head>

<div class="flex items-center justify-between gap-4">
	<h1 class="text-[26px] leading-[34px] font-semibold tracking-[-0.02em]">Projects</h1>
	<Button href={resolve('/admin/(app)/projects/[id]', { id: 'new' })}>
		<PlusIcon aria-hidden="true" />New project
	</Button>
</div>

<div
	role="tablist"
	aria-label="Filter projects by status"
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

{#if loading}
	<div class="flex flex-col gap-2" aria-busy="true" aria-label="Loading projects">
		{#each [0, 1, 2] as i (i)}<div class="h-14 rounded-sm bg-fill-muted"></div>{/each}
	</div>
{:else if data.projects.length === 0}
	<EmptyState
		icon={FolderIcon}
		title={data.total === 0 ? 'No projects yet' : 'No projects here'}
		text="Add a project with a short summary and a case study. Mark one as featured to spotlight it on Home."
	>
		<Button href={resolve('/admin/(app)/projects/[id]', { id: 'new' })}>
			<PlusIcon aria-hidden="true" />New project
		</Button>
	</EmptyState>
{:else}
	<div class="overflow-x-auto rounded-lg border border-line">
		<table class="w-full min-w-[640px] text-left">
			<thead class="bg-paper-soft">
				<tr class="text-caption text-ink-muted">
					<th scope="col" class="w-28 px-4 py-2.5 font-normal">Order</th>
					<th scope="col" class="px-4 py-2.5 font-normal">Title</th>
					<th scope="col" class="px-4 py-2.5 font-normal">Status</th>
					<th scope="col" class="px-4 py-2.5 font-normal">Featured</th>
					<th scope="col" class="px-4 py-2.5 font-normal max-[899px]:hidden">Tags</th>
					<th scope="col" class="px-4 py-2.5 font-normal max-[899px]:hidden">Year</th>
					<th scope="col" class="w-14 px-4 py-2.5"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.projects as project (project.id)}
					<tr
						class="border-t border-line transition-colors hover:bg-fill-hover {flash === project.id
							? 'bg-fill-hover'
							: ''}"
					>
						<td class="px-4 py-3">
							<div class="flex items-center gap-1">
								<span class="w-5 text-caption text-ink-subtle">{project.position}</span>
								<Button
									variant="ghost"
									size="icon"
									class="h-[22px] w-7"
									aria-label={`Move ${project.title} up`}
									disabled={project.position === 1}
									onclick={() => runAction('move', { id: project.id, direction: 'up' })}
								>
									<ArrowUpIcon class="size-3.5" aria-hidden="true" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-[22px] w-7"
									aria-label={`Move ${project.title} down`}
									disabled={project.position === data.total}
									onclick={() => runAction('move', { id: project.id, direction: 'down' })}
								>
									<ArrowDownIcon class="size-3.5" aria-hidden="true" />
								</Button>
							</div>
						</td>
						<td class="px-4 py-3">
							<a
								href={resolve('/admin/(app)/projects/[id]', { id: project.id })}
								class="text-[15px] leading-[22px] font-semibold">{project.title}</a
							>
							<div class="text-caption text-ink-subtle normal-case">{project.slug}</div>
						</td>
						<td class="px-4 py-3"><StatusBadge status={project.status} /></td>
						<td class="px-4 py-3">
							<div class="flex items-center gap-2">
								<Switch
									checked={project.featured}
									aria-label={`Feature ${project.title}`}
									onCheckedChange={(on) => feature(project, on)}
								/>
								{#if project.featured}
									<span
										class="inline-flex h-6 items-center gap-1 rounded-sm bg-fill-muted px-2 text-[12px] font-medium text-ink-muted"
										><StarIcon class="size-3 fill-current" aria-hidden="true" />Featured</span
									>
								{/if}
							</div>
						</td>
						<td class="px-4 py-3 max-[899px]:hidden">
							<span class="text-small text-ink-muted"
								>{project.tags.map((t) => t.name).join(', ') || '—'}</span
							>
						</td>
						<td class="px-4 py-3 text-caption text-ink-subtle max-[899px]:hidden"
							>{project.year ?? '—'}</td
						>
						<td class="px-2 py-2 text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="ghost"
											size="icon"
											aria-label={`Actions for ${project.title}`}
										>
											<EllipsisIcon aria-hidden="true" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item
										onSelect={() => goto(resolve('/admin/(app)/projects/[id]', { id: project.id }))}
										>Edit</DropdownMenu.Item
									>
									<DropdownMenu.Item
										onSelect={() =>
											runAction(
												'setStatus',
												{
													id: project.id,
													status: project.status === 'published' ? 'draft' : 'published'
												},
												{
													success: project.status === 'published' ? 'Unpublished.' : 'Published.'
												}
											)}
									>
										{project.status === 'published' ? 'Unpublish' : 'Publish'}
									</DropdownMenu.Item>
									<DropdownMenu.Item
										onSelect={() => {
											deleting = { id: project.id, title: project.title };
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
	title="Delete this project?"
	confirmLabel="Delete project"
	onconfirm={async () => {
		if (deleting) await runAction('delete', { id: deleting.id }, { success: 'Project deleted.' });
	}}
>
	“{deleting?.title}” will be removed from the site. Posts about it stay, without the link. This
	cannot be undone.
</ConfirmDialog>

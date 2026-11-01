<script lang="ts">
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';
	import LockIcon from '@lucide/svelte/icons/lock';
	import { deserialize } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { SAVED_NOTE } from '#lib/admin/actions.js';
	import { Editor } from '#lib/admin/editor.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { slugify } from '#lib/slug.js';
	import { cn } from '#lib/utils.js';
	import ConfirmDialog from './confirm-dialog.svelte';
	import EditorBar from './editor-bar.svelte';
	import Field from './field.svelte';
	import ImageField from './image-field.svelte';
	import LeaveGuard from './leave-guard.svelte';
	import MarkdownEditor from './markdown-editor.svelte';
	import SessionExpiredDialog from './session-expired-dialog.svelte';
	import TagPicker from './tag-picker.svelte';

	type Tag = { id: string; name: string; slug: string };
	type Data = {
		tags: Tag[];
		otherFeatured: string | null;
		project: {
			id: string;
			title: string;
			slug: string;
			summary: string;
			body: string | null;
			year: number | null;
			role: string | null;
			team: string | null;
			liveUrl: string | null;
			repoUrl: string | null;
			coverImage: string | null;
			coverAlt: string | null;
			featured: boolean;
			status: 'draft' | 'published';
			firstPublishedAt: Date | null;
			tagIds: string[];
		} | null;
	};

	let { data }: { data: Data } = $props();

	// The page keys this component on the project id, so reading the initial data once is intended.
	// svelte-ignore state_referenced_locally
	const project = data.project;
	const editor = new Editor({
		title: project?.title ?? '',
		slug: project?.slug ?? '',
		summary: project?.summary ?? '',
		body: project?.body ?? '',
		year: project?.year ? String(project.year) : '',
		role: project?.role ?? '',
		team: project?.team ?? '',
		liveUrl: project?.liveUrl ?? '',
		repoUrl: project?.repoUrl ?? '',
		coverImage: project?.coverImage ?? '',
		coverAlt: project?.coverAlt ?? '',
		tagIds: [...(project?.tagIds ?? [])]
	});

	// svelte-ignore state_referenced_locally
	let tags = $state<Tag[]>([...data.tags]);
	let status = $state<'draft' | 'published'>(project?.status ?? 'draft');
	let locked = $state(Boolean(project?.firstPublishedAt));
	let id = $state(project?.id ?? null);
	let featured = $state(project?.featured ?? false);
	let slugTouched = $state(Boolean(project));
	let confirmDelete = $state(false);
	let expiredOpen = $state(false);
	let deleting = $state(false);

	$effect(() => {
		if (!slugTouched && !locked) editor.data.slug = slugify(editor.data.title);
	});
	$effect(() => {
		if (editor.status === 'expired') expiredOpen = true;
	});

	async function save(intent: 'save' | 'publish' | 'unpublish') {
		if (intent === 'publish' && editor.data.coverImage && !editor.data.coverAlt.trim()) {
			editor.errors = { coverAlt: 'Add alt text for the cover image' };
			editor.phase = 'failed';
			editor.message = 'Check the highlighted fields';
			return;
		}
		const result = await editor.submit(intent);
		if (!result) return;
		status = result.status;
		locked = Boolean(result.publishedAt);
		toast.success(
			intent === 'publish' ? 'Published.' : intent === 'unpublish' ? 'Unpublished.' : 'Saved.',
			{ description: SAVED_NOTE }
		);
		if (!id) {
			id = result.id;
			await goto(resolve('/admin/(app)/projects/[id]', { id: result.id }), { replaceState: true });
		}
	}

	async function setFeatured(on: boolean) {
		const body = new FormData();
		body.set('featured', String(on));
		const response = await fetch('?/setFeatured', {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await response.text());
		if (result.type === 'success') {
			featured = on;
			const previous = (result.data as { previous?: { title: string } | null } | undefined)
				?.previous;
			toast.success(on ? `Featured.` : 'No longer featured.', {
				description: previous ? `${previous.title} is no longer featured.` : undefined
			});
			await invalidateAll();
		} else {
			toast.error('Could not change the featured project.', {
				duration: Infinity,
				closeButton: true
			});
		}
	}

	async function remove() {
		deleting = true;
		editor.markSaved();
		const response = await fetch('?/delete', {
			method: 'POST',
			body: new FormData(),
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await response.text());
		if (result.type === 'redirect') {
			toast.success('Project deleted.');
			await goto(resolve('/admin/(app)/projects'));
		} else {
			deleting = false;
			toast.error('Could not delete the project.', { duration: Infinity, closeButton: true });
		}
	}

	async function createTag(name: string): Promise<Tag | null> {
		const body = new FormData();
		body.set('name', name);
		try {
			const response = await fetch('?/createTag', {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await response.text());
			if (result.type === 'success') return (result.data as { tag: Tag }).tag;
			toast.error('Could not create the tag.');
		} catch {
			toast.error('Could not reach the server.');
		}
		return null;
	}

	const input =
		'h-9 w-full rounded-md border border-line-strong bg-paper px-3 text-ui disabled:bg-paper-soft';
	const busy = $derived(editor.status === 'saving');
	const err = (name: string) => editor.errors[name];
</script>

<svelte:head><title>{editor.data.title || 'New project'} · Admin</title></svelte:head>

<LeaveGuard dirty={editor.dirty && !deleting} />

<div class="-mx-4 -my-6 pb-20 min-[720px]:-mx-12 min-[720px]:-my-8 min-[720px]:pb-0">
	<EditorBar
		backLabel="Projects"
		backRoute="/admin/(app)/projects"
		title={editor.data.title}
		{status}
		state={editor.status}
	>
		{#snippet actions()}
			{#if status === 'published'}
				<Button
					variant="ghost"
					href={resolve('/(site)/projects/[slug]', { slug: editor.data.slug })}>View</Button
				>
				<Button variant="ghost" disabled={busy} onclick={() => save('unpublish')}>Unpublish</Button>
				<Button disabled={busy} onclick={() => save('save')}>Save</Button>
			{:else}
				<Button variant="secondary" disabled={busy} onclick={() => save('save')}>Save draft</Button>
				<Button disabled={busy} onclick={() => save('publish')}>Publish</Button>
			{/if}
		{/snippet}
	</EditorBar>

	{#if editor.status === 'failed' && editor.message}
		<div
			role="alert"
			class="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-md border border-ink bg-paper p-3 min-[720px]:mx-8"
		>
			<AlertCircleIcon class="size-4 shrink-0" aria-hidden="true" />
			<p class="flex-1 text-small"><b class="font-semibold">Not saved.</b> {editor.message}</p>
			<Button variant="secondary" size="sm" onclick={() => save('save')}>Retry</Button>
		</div>
	{/if}

	<div
		class="mx-auto grid max-w-[1360px] gap-8 p-4 min-[720px]:p-8 min-[1100px]:grid-cols-[1fr_320px]"
	>
		<div class="flex min-w-0 flex-col gap-6">
			<Field id="title" label="Title" error={err('title')}>
				{#snippet children({ describedby, invalid })}
					<!-- A textarea that grows with its content, so a long title wraps instead of being cut off. -->
					<textarea
						id="title"
						rows="1"
						bind:value={editor.data.title}
						aria-describedby={describedby}
						aria-invalid={invalid}
						placeholder="Project name"
						onkeydown={(event) => event.key === 'Enter' && event.preventDefault()}
						class="block field-sizing-content w-full resize-none overflow-hidden border-0 bg-transparent px-0 text-[36px] leading-[44px] font-semibold tracking-[-0.025em] focus:ring-0"
					></textarea>
				{/snippet}
			</Field>

			<Field
				id="summary"
				label="Summary"
				hint="One or two sentences: what it is and who it is for. Shown on cards."
				error={err('summary')}
			>
				{#snippet children({ describedby, invalid })}
					<textarea
						id="summary"
						rows="3"
						bind:value={editor.data.summary}
						aria-describedby={describedby}
						aria-invalid={invalid}
						class={cn(
							'w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-ui',
							invalid && 'ring-2 ring-ink'
						)}></textarea>
				{/snippet}
			</Field>

			<MarkdownEditor id="body" label="Case study" bind:value={editor.data.body} />
		</div>

		<aside class="flex flex-col gap-5 self-start rounded-lg border border-line bg-paper p-5">
			<Field id="status" label="Status" hint="Use Publish or Unpublish above to change this.">
				{#snippet children({ describedby })}
					<input
						id="status"
						type="text"
						readonly
						value={status === 'published' ? 'Published' : 'Draft'}
						aria-describedby={describedby}
						class={cn(input, 'bg-paper-soft')}
					/>
				{/snippet}
			</Field>

			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="featured" class="text-ui">Featured</label>
					<Switch
						id="featured"
						checked={featured}
						disabled={!id}
						aria-describedby="featured-hint"
						onCheckedChange={setFeatured}
					/>
				</div>
				<p id="featured-hint" class="text-[12px] leading-4 text-ink-subtle">
					{#if !id}
						Save the project first, then you can feature it.
					{:else if data.otherFeatured && !featured}
						Turning this on removes the flag from {data.otherFeatured}.
					{:else}
						Only one project is featured on Home at a time.
					{/if}
				</p>
			</div>

			<Field
				id="slug"
				label="Slug"
				hint={locked
					? 'Locked after the first publish, so links keep working.'
					: 'Made from the title. You can edit it until you publish.'}
				error={err('slug')}
			>
				{#snippet children({ describedby, invalid })}
					<div class="relative">
						<input
							id="slug"
							type="text"
							bind:value={editor.data.slug}
							oninput={() => (slugTouched = true)}
							readonly={locked}
							aria-describedby={describedby}
							aria-invalid={invalid}
							class={cn(
								input,
								'font-mono text-[13px]',
								locked && 'bg-paper-soft pr-9',
								invalid && 'ring-2 ring-ink'
							)}
						/>
						{#if locked}
							<LockIcon
								class="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-subtle"
								aria-hidden="true"
							/>
						{/if}
					</div>
				{/snippet}
			</Field>

			<div class="grid grid-cols-2 gap-3">
				<Field id="year" label="Year" error={err('year')}>
					{#snippet children({ describedby, invalid })}
						<input
							id="year"
							type="text"
							inputmode="numeric"
							bind:value={editor.data.year}
							aria-describedby={describedby}
							aria-invalid={invalid}
							class={cn(input, 'font-mono text-[13px]', invalid && 'ring-2 ring-ink')}
						/>
					{/snippet}
				</Field>
				<Field id="role" label="Role">
					{#snippet children({ describedby })}
						<input
							id="role"
							type="text"
							bind:value={editor.data.role}
							aria-describedby={describedby}
							class={input}
						/>
					{/snippet}
				</Field>
			</div>

			<Field id="team" label="Team" hint="For example Solo or Team of 4.">
				{#snippet children({ describedby })}
					<input
						id="team"
						type="text"
						bind:value={editor.data.team}
						aria-describedby={describedby}
						class={input}
					/>
				{/snippet}
			</Field>

			<Field id="liveUrl" label="Live URL" error={err('liveUrl')}>
				{#snippet children({ describedby, invalid })}
					<input
						id="liveUrl"
						type="url"
						bind:value={editor.data.liveUrl}
						aria-describedby={describedby}
						aria-invalid={invalid}
						class={cn(input, invalid && 'ring-2 ring-ink')}
					/>
				{/snippet}
			</Field>

			<Field id="repoUrl" label="Repository URL" error={err('repoUrl')}>
				{#snippet children({ describedby, invalid })}
					<input
						id="repoUrl"
						type="url"
						bind:value={editor.data.repoUrl}
						aria-describedby={describedby}
						aria-invalid={invalid}
						class={cn(input, invalid && 'ring-2 ring-ink')}
					/>
				{/snippet}
			</Field>

			<Field id="tags" label="Tags">
				<TagPicker
					id="tags-new"
					bind:tags
					bind:selected={editor.data.tagIds}
					oncreate={createTag}
				/>
			</Field>

			<div class="flex flex-col gap-1.5">
				<span class="text-ui">Cover image</span>
				<ImageField
					id="cover"
					bind:path={editor.data.coverImage}
					bind:alt={editor.data.coverAlt}
					altError={err('coverAlt')}
				/>
			</div>

			{#if id}
				<div class="border-t border-line pt-4">
					<Button variant="ghost" class="text-ink-subtle" onclick={() => (confirmDelete = true)}
						>Delete project</Button
					>
				</div>
			{/if}
		</aside>
	</div>
</div>

<ConfirmDialog
	bind:open={confirmDelete}
	title="Delete this project?"
	confirmLabel="Delete project"
	onconfirm={remove}
>
	“{editor.data.title || 'Untitled'}” will be removed from the site. Posts about it stay, without
	the link. This cannot be undone.
</ConfirmDialog>

<SessionExpiredDialog
	bind:open={expiredOpen}
	markdown={editor.data.body ?? ''}
	onretry={() => {
		expiredOpen = false;
		void save('save');
	}}
/>

<script lang="ts">
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';
	import LockIcon from '@lucide/svelte/icons/lock';
	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { SAVED_NOTE } from '#lib/admin/actions.js';
	import { Editor } from '#lib/admin/editor.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
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
		projects: { id: string; title: string }[];
		post: {
			id: string;
			title: string;
			slug: string;
			excerpt: string;
			body: string;
			coverImage: string | null;
			coverAlt: string | null;
			projectId: string | null;
			status: 'draft' | 'published';
			publishedAt: Date | null;
			tagIds: string[];
		} | null;
	};

	let { data }: { data: Data } = $props();

	// The page keys this component on the post id, so reading the initial data once is intended.
	// svelte-ignore state_referenced_locally
	const post = data.post;
	const editor = new Editor({
		title: post?.title ?? '',
		slug: post?.slug ?? '',
		excerpt: post?.excerpt ?? '',
		body: post?.body ?? '',
		coverImage: post?.coverImage ?? '',
		coverAlt: post?.coverAlt ?? '',
		projectId: post?.projectId ?? '',
		tagIds: [...(post?.tagIds ?? [])]
	});

	// svelte-ignore state_referenced_locally
	let tags = $state<Tag[]>([...data.tags]);
	let status = $state<'draft' | 'published'>(post?.status ?? 'draft');
	let locked = $state(Boolean(post?.publishedAt));
	let id = $state(post?.id ?? null);
	let slugTouched = $state(Boolean(post));
	let confirmDelete = $state(false);
	let expiredOpen = $state(false);
	let deleting = $state(false);

	// The slug follows the title until it is edited by hand or locked (FR-19).
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
			// First save of a new post: continue on its own page. Nothing is unsaved, so the guard stays quiet.
			await goto(resolve('/admin/(app)/posts/[id]', { id: result.id }), { replaceState: true });
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
			toast.success('Post deleted.');
			await goto(resolve('/admin/(app)/posts'));
		} else {
			deleting = false;
			toast.error('Could not delete the post.', { duration: Infinity, closeButton: true });
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
			toast.error(
				(result.type === 'failure' && (result.data as { message?: string })?.message) ||
					'Could not create the tag.'
			);
		} catch {
			toast.error('Could not reach the server.');
		}
		return null;
	}

	const input =
		'h-9 w-full rounded-md border border-line-strong bg-paper px-3 text-ui disabled:bg-paper-soft';
	const busy = $derived(editor.status === 'saving');
</script>

<svelte:head><title>{editor.data.title || 'New post'} · Admin</title></svelte:head>

<LeaveGuard dirty={editor.dirty && !deleting} />

<div class="-mx-4 -my-6 min-[720px]:-mx-12 min-[720px]:-my-8">
	<EditorBar
		backLabel="Posts"
		backRoute="/admin/(app)/posts"
		title={editor.data.title}
		{status}
		state={editor.status}
	>
		{#snippet actions()}
			{#if status === 'published'}
				<Button variant="ghost" href={resolve('/(site)/blog/[slug]', { slug: editor.data.slug })}
					>View</Button
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
			<Field id="title" label="Title" error={editor.errors.title}>
				{#snippet children({ describedby, invalid })}
					<input
						id="title"
						type="text"
						bind:value={editor.data.title}
						aria-describedby={describedby}
						aria-invalid={invalid}
						placeholder="A title worth clicking"
						class={cn(
							'h-auto w-full border-0 bg-transparent px-0 text-[36px] leading-[44px] font-semibold tracking-[-0.025em] focus:ring-0',
							invalid && 'underline decoration-2'
						)}
					/>
				{/snippet}
			</Field>

			<MarkdownEditor id="body" label="Markdown" bind:value={editor.data.body} />
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

			<Field
				id="slug"
				label="Slug"
				hint={locked
					? 'Locked after the first publish, so links keep working.'
					: 'Made from the title. You can edit it until you publish.'}
				error={editor.errors.slug}
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

			<Field
				id="excerpt"
				label="Excerpt"
				hint="Shown on cards and used as the page description."
				error={editor.errors.excerpt}
			>
				{#snippet children({ describedby, invalid })}
					<textarea
						id="excerpt"
						rows="3"
						bind:value={editor.data.excerpt}
						aria-describedby={describedby}
						aria-invalid={invalid}
						class={cn(
							'w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-ui',
							invalid && 'ring-2 ring-ink'
						)}></textarea>
				{/snippet}
			</Field>

			<Field id="tags" label="Tags">
				<TagPicker id="tags" bind:tags bind:selected={editor.data.tagIds} oncreate={createTag} />
			</Field>

			<Field
				id="project"
				label="The project this post is about"
				hint="Optional. Shown at the end of the post."
			>
				{#snippet children({ describedby })}
					<select
						id="project"
						bind:value={editor.data.projectId}
						aria-describedby={describedby}
						class={input}
					>
						<option value="">None</option>
						{#each data.projects as project (project.id)}
							<option value={project.id}>{project.title}</option>
						{/each}
					</select>
				{/snippet}
			</Field>

			<div class="flex flex-col gap-1.5">
				<span class="text-ui">Cover image</span>
				<ImageField
					id="cover"
					bind:path={editor.data.coverImage}
					bind:alt={editor.data.coverAlt}
					altError={editor.errors.coverAlt}
				/>
			</div>

			{#if id}
				<div class="border-t border-line pt-4">
					<Button variant="ghost" class="text-ink-subtle" onclick={() => (confirmDelete = true)}
						>Delete post</Button
					>
				</div>
			{/if}
		</aside>
	</div>
</div>

<ConfirmDialog
	bind:open={confirmDelete}
	title="Delete this post?"
	confirmLabel="Delete post"
	onconfirm={remove}
>
	“{editor.data.title || 'Untitled'}” will be removed from the site. This cannot be undone.
</ConfirmDialog>

<SessionExpiredDialog
	bind:open={expiredOpen}
	markdown={editor.data.body}
	onretry={() => {
		expiredOpen = false;
		void save('save');
	}}
/>

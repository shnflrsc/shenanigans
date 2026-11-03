<script lang="ts">
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';
	import LoaderIcon from '@lucide/svelte/icons/loader-circle';
	import type { IndicatorState } from '#lib/admin/editor.svelte.js';
	import { cn } from '#lib/utils.js';

	/**
	 * Published: muted fill and a filled dot. Draft: outline and a hollow dot. They differ in shape, not just shade.
	 * In an editor, pass the save state and the chip says what is happening instead: unsaved changes, saving, or not saved.
	 */
	let { status, state = 'clean' }: { status: 'draft' | 'published'; state?: IndicatorState } =
		$props();

	const busy = $derived(state === 'saving');
	const failed = $derived(state === 'failed' || state === 'expired');
	const unsaved = $derived(state === 'unsaved');
	const label = $derived(
		busy
			? 'Saving…'
			: failed
				? 'Not saved'
				: unsaved
					? 'Unsaved changes'
					: status === 'published'
						? 'Published'
						: 'Draft'
	);
</script>

<span
	role="status"
	aria-live="polite"
	class={cn(
		'inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-[12px] font-medium',
		busy || failed || unsaved
			? 'border border-ink bg-paper text-ink'
			: status === 'published'
				? 'bg-fill-muted text-ink-muted'
				: 'border border-line-strong bg-paper text-ink-muted'
	)}
>
	{#if busy}
		<LoaderIcon class="size-3 animate-spin" aria-hidden="true" />
	{:else if failed}
		<AlertCircleIcon class="size-3" aria-hidden="true" />
	{:else}
		<span
			aria-hidden="true"
			class={cn(
				'size-1.5 rounded-full',
				unsaved || status === 'published' ? 'bg-ink' : 'border border-ink-muted bg-transparent'
			)}
		></span>
	{/if}
	{label}
</span>

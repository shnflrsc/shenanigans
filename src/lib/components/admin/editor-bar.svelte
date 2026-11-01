<script lang="ts">
	import type { Snippet } from 'svelte';
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';
	import LoaderIcon from '@lucide/svelte/icons/loader-circle';
	import { resolve } from '$app/paths';
	import type { IndicatorState } from '#lib/admin/editor.svelte.js';
	import StatusBadge from './status-badge.svelte';

	type Props = {
		/** Where the breadcrumb leads back to. */
		backLabel: string;
		backRoute: '/admin/(app)/posts' | '/admin/(app)/projects';
		title: string;
		status: 'draft' | 'published';
		state: IndicatorState;
		actions: Snippet;
		/** Optional controls shown next to the status badge, on every screen size. */
		extra?: Snippet;
	};

	let { backLabel, backRoute, title, status, state, actions, extra }: Props = $props();
</script>

<header
	class="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-paper px-4 py-2 min-[720px]:px-8"
>
	<nav
		aria-label="Breadcrumb"
		class="flex max-w-full min-w-0 flex-1 basis-60 items-center gap-2 text-ui"
	>
		<a href={resolve(backRoute)} class="rounded-md text-ink-subtle hover:text-ink">{backLabel}</a>
		<span aria-hidden="true" class="text-ink-subtle">/</span>
		<span class="truncate font-semibold">{title || 'Untitled'}</span>
	</nav>
	<StatusBadge {status} />
	{@render extra?.()}

	<!-- Save indicator: an unsaved dot or a spinner, always with words. A finished save is a toast. -->
	<p class="flex items-center gap-1.5 text-[13px] leading-5" role="status" aria-live="polite">
		{#if state === 'saving'}
			<LoaderIcon class="size-4 animate-spin text-ink-subtle" aria-hidden="true" /><span
				class="text-ink-subtle">Saving…</span
			>
		{:else if state === 'unsaved'}
			<span aria-hidden="true" class="size-[7px] rounded-full bg-ink"></span><span
				class="font-medium text-ink">Unsaved changes</span
			>
		{:else if state === 'failed' || state === 'expired'}
			<AlertCircleIcon class="size-4" aria-hidden="true" /><span class="font-medium text-ink"
				>Not saved</span
			>
		{/if}
	</p>

	<!-- On desktop the actions sit in this bar; on phones they move to a sticky bar at the bottom. -->
	<div class="ml-auto flex items-center gap-2 max-[719px]:hidden">{@render actions()}</div>
</header>

<div
	class="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-paper p-3 min-[720px]:hidden [&>*]:flex-1"
>
	{@render actions()}
</div>

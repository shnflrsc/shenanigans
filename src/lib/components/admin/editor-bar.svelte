<script lang="ts">
	import type { Snippet } from 'svelte';
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';
	import CheckIcon from '@lucide/svelte/icons/check';
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
	};

	let { backLabel, backRoute, title, status, state, actions }: Props = $props();
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

	<!-- Save indicator: an unsaved dot, a spinner, or a check, always with words. -->
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
		{:else}
			<CheckIcon class="size-4 text-ink-subtle" aria-hidden="true" /><span class="text-ink-subtle"
				>All changes saved</span
			>
		{/if}
	</p>

	<div class="ml-auto flex items-center gap-2">{@render actions()}</div>
</header>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';

	type Props = {
		id: string;
		label: string;
		hint?: string;
		error?: string;
		/** The control, given the ids it must be wired to. */
		children: Snippet<[{ describedby: string | undefined; invalid: boolean }]>;
	};

	let { id, label, hint, error, children }: Props = $props();
	const describedby = $derived(
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
			undefined
	);
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="text-ui">{label}</label>
	{@render children({ describedby, invalid: Boolean(error) })}
	{#if hint}<p id="{id}-hint" class="text-[12px] leading-4 text-ink-subtle">{hint}</p>{/if}
	{#if error}
		<p id="{id}-error" class="flex items-center gap-1.5 text-[13px] leading-5 font-medium text-ink">
			<AlertCircleIcon class="size-4 shrink-0" aria-hidden="true" />{error}
		</p>
	{/if}
</div>

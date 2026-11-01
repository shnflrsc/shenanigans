<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';
	import Eyebrow from './eyebrow.svelte';

	type Props = {
		eyebrow?: string;
		/** Optional softer second half, set in ink-subtle. */
		soft?: string;
		align?: 'start' | 'center';
		tag?: 'h1' | 'h2';
		children: Snippet;
	};

	let { eyebrow, soft, align = 'start', tag = 'h2', children }: Props = $props();
</script>

<div class={cn('flex flex-col gap-3', align === 'center' && 'items-center text-center')}>
	{#if eyebrow}
		<Eyebrow>{eyebrow}</Eyebrow>
	{/if}
	<svelte:element this={tag} class="text-title text-ink">
		{@render children()}
		{#if soft}
			<span class="text-ink-subtle">{soft}</span>
		{/if}
	</svelte:element>
</div>

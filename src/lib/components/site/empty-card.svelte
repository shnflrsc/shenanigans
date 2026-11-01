<script lang="ts">
	import type { Snippet } from 'svelte';
	import Frame from './frame.svelte';

	type Props = {
		eyebrow?: string;
		title: string;
		text?: string;
		variant?: 'outline' | 'soft';
		/** Heading level of the title: 3 under a section heading (Home), 2 directly under the page title. */
		level?: 2 | 3;
		/** Recovery actions: one or two buttons. */
		children?: Snippet;
	};

	let { eyebrow, title, text, variant = 'outline', level = 3, children }: Props = $props();
</script>

<Frame {variant} padding="lg">
	<div class="flex flex-col items-center gap-3 text-center">
		{#if eyebrow}<span class="text-caption text-ink-subtle">{eyebrow}</span>{/if}
		<svelte:element this={`h${level}`} class="text-card-title">{title}</svelte:element>
		{#if text}<p class="max-w-[420px] text-small text-ink-muted">{text}</p>{/if}
		{#if children}<div class="mt-2 flex flex-wrap justify-center gap-2">
				{@render children()}
			</div>{/if}
	</div>
</Frame>

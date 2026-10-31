<script lang="ts">
	import type { Snippet } from 'svelte';
	import Frame from './frame.svelte';

	type Props = {
		eyebrow?: string;
		title: string;
		text: string;
		variant?: 'outline' | 'soft';
		/** Recovery actions: one or two buttons. */
		children?: Snippet;
	};

	let { eyebrow, title, text, variant = 'outline', children }: Props = $props();
</script>

<Frame {variant} padding="lg">
	<div class="flex flex-col items-center gap-3 text-center">
		{#if eyebrow}<span class="text-caption text-ink-subtle">{eyebrow}</span>{/if}
		<h3 class="text-card-title">{title}</h3>
		<p class="max-w-[420px] text-small text-ink-muted">{text}</p>
		{#if children}<div class="mt-2 flex flex-wrap justify-center gap-2">
				{@render children()}
			</div>{/if}
	</div>
</Frame>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { reveal } from '#lib/motion/reveal.js';
	import { cn } from '#lib/utils.js';

	type Props = {
		tone?: 'plain' | 'soft';
		width?: 'narrow' | 'default' | 'wide';
		divider?: boolean;
		class?: string;
		innerClass?: string;
		id?: string;
		/** The first section of a page: slides in once as the page appears (the others slide in on scroll). */
		enter?: boolean;
		children: Snippet;
	};

	let {
		tone = 'plain',
		width = 'default',
		divider = false,
		class: className,
		innerClass,
		id,
		enter = false,
		children
	}: Props = $props();

	const widths = { narrow: 'max-w-[720px]', default: 'max-w-[1080px]', wide: 'max-w-[1280px]' };
</script>

<section
	{id}
	class={cn(
		'py-24',
		tone === 'soft' ? 'bg-paper-soft' : 'bg-paper',
		divider && 'border-t border-line',
		className
	)}
>
	<!-- The content block moves; the section's own background band stays still. -->
	<div
		use:reveal={enter}
		data-enter={enter ? '' : undefined}
		data-reveal={enter ? undefined : ''}
		class={cn('mx-auto w-full px-6 min-[1024px]:px-16', widths[width], innerClass)}
	>
		{@render children()}
	</div>
</section>

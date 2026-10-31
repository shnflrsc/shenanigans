<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	type Props = {
		tone?: 'plain' | 'soft';
		width?: 'narrow' | 'default' | 'wide';
		divider?: boolean;
		class?: string;
		innerClass?: string;
		id?: string;
		children: Snippet;
	};

	let {
		tone = 'plain',
		width = 'default',
		divider = false,
		class: className,
		innerClass,
		id,
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
	<div class={cn('mx-auto w-full px-6 min-[1024px]:px-16', widths[width], innerClass)}>
		{@render children()}
	</div>
</section>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	type Props = {
		variant?: 'outline' | 'soft' | 'raised';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		interactive?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		variant = 'outline',
		padding = 'md',
		interactive = false,
		class: className,
		children
	}: Props = $props();

	const variants = {
		outline: 'bg-paper border border-line',
		soft: 'bg-paper-soft',
		raised: 'bg-paper-raised shadow-md'
	};
	const paddings = { none: 'p-0', sm: 'p-4', md: 'p-6', lg: 'p-12' };
</script>

<div
	class={cn(
		'relative rounded-lg transition-[background-color,border-color,box-shadow] duration-150 ease-out',
		variants[variant],
		paddings[padding],
		interactive && 'hover:bg-paper-raised hover:shadow-md',
		className
	)}
>
	{@render children()}
</div>

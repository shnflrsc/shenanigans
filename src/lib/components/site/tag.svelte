<script lang="ts">
	import { cn } from '#lib/utils.js';

	type Props = {
		label: string;
		count?: number;
		/** Renders a link (used for URL-based filters). */
		href?: string;
		/** Marks a filter tag as the active one. */
		active?: boolean;
		class?: string;
	};

	let { label, count, href, active, class: className }: Props = $props();

	const filter = $derived(href !== undefined);
	const classes = $derived(
		cn(
			'inline-flex items-center gap-1.5 rounded-sm text-[12px] leading-4 font-medium transition-colors duration-150',
			filter
				? cn(
						'h-[30px] border px-3',
						active
							? 'border-ink bg-ink text-on-ink'
							: 'border-line bg-paper text-ink-muted hover:bg-fill-hover'
					)
				: 'h-6 bg-fill-muted px-2 text-ink-muted',
			className
		)
	);
</script>

{#snippet inner()}
	{label}
	{#if count !== undefined}
		<span class="font-mono text-[11px] opacity-80">{count}</span>
	{/if}
{/snippet}

{#if href !== undefined}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- filter hrefs are built by callers from resolved paths -->
	<a {href} class={classes} aria-current={active ? 'true' : undefined} data-sveltekit-noscroll>
		{@render inner()}
	</a>
{:else}
	<span class={classes}>{@render inner()}</span>
{/if}

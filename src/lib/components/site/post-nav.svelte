<script lang="ts">
	type Link = { href: string; title: string } | null;

	/** Two outline cards side by side; a missing side leaves its slot empty (DESIGN.md PostNav). */
	let { previous, next, label }: { previous: Link; next: Link; label: string } = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass hrefs already built with resolve() -->
{#if previous || next}
	<nav aria-label={label} class="grid gap-4 min-[720px]:grid-cols-2">
		{#if previous}
			<a
				href={previous.href}
				class="group flex flex-col gap-1 rounded-lg border border-line p-6 transition-colors duration-150 hover:bg-fill-hover"
			>
				<span class="text-caption text-ink-subtle">Previous</span>
				<span class="text-card-title">{previous.title}</span>
			</a>
		{:else}
			<span class="max-[719px]:hidden"></span>
		{/if}
		{#if next}
			<a
				href={next.href}
				class="group flex flex-col gap-1 rounded-lg border border-line p-6 transition-colors duration-150 hover:bg-fill-hover min-[720px]:text-right"
			>
				<span class="text-caption text-ink-subtle">Next</span>
				<span class="text-card-title">{next.title}</span>
			</a>
		{/if}
	</nav>
{/if}

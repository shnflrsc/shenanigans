<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	type Props = {
		icon: Component;
		title: string;
		text: string;
		children?: Snippet;
	};

	let { icon: Icon, title, text, children }: Props = $props();
</script>

<div
	class="flex flex-col items-center gap-3 rounded-lg border border-line bg-paper p-12 text-center"
>
	<span class="grid size-12 place-items-center rounded-lg bg-fill-muted text-ink-muted">
		<Icon class="size-5" aria-hidden="true" />
	</span>
	<h2 class="text-[17px] leading-6 font-semibold">{title}</h2>
	<p class="max-w-[420px] text-small text-ink-muted">{text}</p>
	{#if children}<div class="mt-2">{@render children()}</div>{/if}
</div>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<span class="inline-block rounded-sm bg-fill-muted px-2 py-0.5 text-caption text-ink-muted">
	{@render children()}
</span>

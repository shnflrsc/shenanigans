<script lang="ts">
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { Button } from '#lib/components/ui/button/index.js';
	import { theme } from '#lib/theme.svelte.js';

	let { class: className }: { class?: string } = $props();
</script>

<Button
	variant="ghost"
	size="icon"
	class={className}
	aria-label={theme.current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
	onclick={() => theme.toggle()}
>
	{#if theme.current === 'dark'}
		<SunIcon aria-hidden="true" />
	{:else}
		<MoonIcon aria-hidden="true" />
	{/if}
</Button>

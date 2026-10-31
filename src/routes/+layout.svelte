<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { installCopyButtons } from '#lib/markdown/copy-button.js';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => installCopyButtons());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<!-- On phones the admin editors have a sticky action bar, so toasts sit above it. -->
<Toaster position="bottom-center" mobileOffset={{ bottom: 88 }} />

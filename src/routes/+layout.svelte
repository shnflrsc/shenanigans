<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { installCopyButtons } from '#lib/markdown/copy-button.js';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => installCopyButtons());
</script>

<svelte:head>
	<link rel="icon" href={asset('favicon.svg')} type="image/svg+xml" />
	<link rel="icon" href={asset('favicon-32.png')} type="image/png" sizes="32x32" />
	<link rel="apple-touch-icon" href={asset('apple-touch-icon.png')} />
	<link rel="manifest" href={asset('site.webmanifest')} />
</svelte:head>

{@render children()}
<!-- On phones the admin editors have a sticky action bar, so toasts sit above it. -->
<Toaster position="bottom-center" mobileOffset={{ bottom: 88 }} />

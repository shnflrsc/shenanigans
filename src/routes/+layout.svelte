<script lang="ts">
	import './layout.css';
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { installCopyButtons } from '#lib/markdown/copy-button.js';
	import { canTransition } from '#lib/motion/view-transition.js';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => installCopyButtons());

	// Moving between public pages is a view transition: the header and footer stay, the main area fades and rises.
	// The admin keeps instant navigation, and browsers without view transitions navigate as before.
	onNavigate((navigation) => {
		const admin = (url?: URL) => url?.pathname.startsWith('/admin');
		if (!canTransition() || admin(navigation.from?.url) || admin(navigation.to?.url)) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<!-- On phones the admin editors have a sticky action bar, so toasts sit above it. -->
<Toaster position="bottom-center" mobileOffset={{ bottom: 88 }} />

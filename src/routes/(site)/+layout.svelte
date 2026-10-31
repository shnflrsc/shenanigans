<script lang="ts">
	import SiteFooter from '#lib/components/site/site-footer.svelte';
	import SiteNav from '#lib/components/site/site-nav.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="flex min-h-dvh flex-col">
	<SiteNav />
	<!-- The footer sits at the bottom of the viewport on short pages (FR-26). -->
	<main class="flex-1">
		{@render children()}
	</main>
	<SiteFooter />
</div>

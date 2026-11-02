<script lang="ts">
	import SocialLinks from './social-links.svelte';
	import { site } from '#lib/site.js';

	const year = new Date().getFullYear();
</script>

<footer class="border-t border-line bg-paper-soft">
	<div
		class="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 min-[1024px]:px-16"
	>
		<span class="text-caption text-ink-subtle">© {year} {site.fullName}</span>
		<SocialLinks />
	</div>
</footer>

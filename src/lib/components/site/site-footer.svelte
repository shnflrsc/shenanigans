<script lang="ts">
	import MailIcon from '@lucide/svelte/icons/mail';
	import BrandIcon from './brand-icons.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { mailto, site } from '#lib/site.js';

	const year = new Date().getFullYear();
</script>

<footer class="border-t border-line bg-paper-soft">
	<div
		class="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 min-[1024px]:px-16"
	>
		<span class="text-caption text-ink-subtle">© {year} {site.fullName}</span>
		<ul class="flex items-center gap-1" aria-label="Contact and social links">
			<li>
				<Button variant="ghost" size="sm" href={mailto}
					><MailIcon aria-hidden="true" class="text-ink-subtle" />Email</Button
				>
			</li>
			<li>
				<Button variant="ghost" size="sm" href={site.github}
					><BrandIcon brand="github" class="size-4 text-ink-subtle" />GitHub</Button
				>
			</li>
			<li>
				<Button variant="ghost" size="sm" href={site.linkedin}
					><BrandIcon brand="linkedin" class="size-4 text-ink-subtle" />LinkedIn</Button
				>
			</li>
		</ul>
	</div>
</footer>

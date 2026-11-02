<script lang="ts">
	import MailIcon from '@lucide/svelte/icons/mail';
	import BrandIcon from './brand-icons.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { mailto, site } from '#lib/site.js';

	let { class: className, large = false }: { class?: string; large?: boolean } = $props();
	const button = $derived(large ? 'size-11' : undefined);
</script>

<!-- Icons only: each link has an accessible name instead of a visible label. -->
<ul class={['flex items-center gap-1', className]} aria-label="Contact and social links">
	<li>
		<Button variant="ghost" size="icon" class={button} href={mailto} aria-label="Email"
			><MailIcon aria-hidden="true" class="text-ink-subtle" /></Button
		>
	</li>
	<li>
		<Button variant="ghost" size="icon" class={button} href={site.github} aria-label="GitHub"
			><BrandIcon brand="github" class="size-4 text-ink-subtle" /></Button
		>
	</li>
	<li>
		<Button variant="ghost" size="icon" class={button} href={site.linkedin} aria-label="LinkedIn"
			><BrandIcon brand="linkedin" class="size-4 text-ink-subtle" /></Button
		>
	</li>
</ul>

<script lang="ts">
	import MailIcon from '@lucide/svelte/icons/mail';
	import { Button } from '#lib/components/ui/button/index.js';
	import { mailto, site } from '#lib/site.js';
	import BrandIcon from './brand-icons.svelte';
	import Frame from './frame.svelte';
	import Section from './section.svelte';
</script>

<Section id="contact" class="py-16">
	<Frame variant="soft" padding="lg" class="rounded-xl text-center">
		<h2 class="text-title">
			Got something in mind? <span class="text-ink-subtle">Let’s talk.</span>
		</h2>
		<p class="mx-auto mt-3 max-w-[480px] text-body text-ink-muted">
			Internships, projects, or a bug you spotted on this site. Email is the fastest way to reach
			me.
		</p>
		<div class="mt-6 flex flex-wrap justify-center gap-2">
			<Button href={mailto}><MailIcon aria-hidden="true" />Email</Button>
			<Button variant="secondary" href={site.github}
				><BrandIcon brand="github" class="size-4" />GitHub</Button
			>
			<Button variant="secondary" href={site.linkedin}
				><BrandIcon brand="linkedin" class="size-4" />LinkedIn</Button
			>
		</div>
	</Frame>
</Section>

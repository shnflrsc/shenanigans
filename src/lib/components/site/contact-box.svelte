<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { mailto, site } from '#lib/site.js';
	import Frame from './frame.svelte';
	import Section from './section.svelte';
</script>

<Section class="py-16">
	<Frame variant="soft" padding="lg" class="rounded-xl text-center">
		<h2 class="text-title">
			Got something in mind? <span class="text-ink-subtle">Let’s talk.</span>
		</h2>
		<p class="mx-auto mt-3 max-w-[480px] text-body text-ink-muted">
			Internships, projects, or a bug you spotted on this site. Email is the fastest way to reach
			me.
		</p>
		<div class="mt-6 flex flex-wrap justify-center gap-2">
			<Button href={mailto}>Get in touch</Button>
			<Button variant="secondary" href={site.github}>GitHub</Button>
			<Button variant="secondary" href={site.linkedin}>LinkedIn</Button>
		</div>
	</Frame>
</Section>

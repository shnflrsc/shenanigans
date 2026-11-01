<script lang="ts">
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import Portrait from './portrait.svelte';
	import Section from './section.svelte';
</script>

<Section>
	<div class="flex flex-wrap items-center justify-between gap-x-16 gap-y-12">
		<div class="flex min-w-0 flex-1 basis-[480px] flex-col items-start gap-8">
			<div class="flex flex-col gap-4">
				<h1 class="text-hero">
					Hi, I build things.<br />
					<span class="text-ink-subtle">Sometimes they even work.</span>
				</h1>
				<p class="max-w-[560px] text-lead text-ink-muted">
					IT student and developer. This is where I keep my projects and write about what I learn
					along the way.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button size="lg" href={resolve('/(site)/projects')}
					>View projects<ArrowRightIcon aria-hidden="true" /></Button
				>
				<Button variant="secondary" size="lg" href={resolve('/(site)/blog')}>Read the blog</Button>
			</div>
		</div>
		<Portrait />
	</div>
</Section>

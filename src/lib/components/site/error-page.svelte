<script lang="ts">
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import { mailto } from '#lib/site.js';
	import Eyebrow from './eyebrow.svelte';
	import Section from './section.svelte';
	import SiteFooter from './site-footer.svelte';
	import SiteNav from './site-nav.svelte';

	let { status }: { status: number } = $props();

	// Playful copy only where nothing is blocked: the 404. Errors say plainly what happened.
	const copy = $derived(
		status === 404
			? {
					eyebrow: '404',
					title: 'This page wandered off.',
					soft: 'Or it was never here.',
					lead: 'The link may be old, or I took the page down. Here are some ways back.'
				}
			: status === 429
				? {
						eyebrow: '429',
						title: 'That’s a lot of requests.',
						soft: 'Try again in a minute.',
						lead: 'I’ve paused requests from your connection for a moment.'
					}
				: {
						eyebrow: 'Error',
						title: 'Something broke on my end.',
						soft: 'Not yours.',
						lead: 'It’s been logged. Try again, or email me if it keeps happening.'
					}
	);
</script>

<svelte:head>
	<title>{copy.eyebrow === 'Error' ? 'Something went wrong' : copy.title} · Shenanigans</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="site-motion flex min-h-dvh flex-col">
	<SiteNav />
	<main class="flex-1">
		<Section>
			<div data-enter class="mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center">
				<Eyebrow>{copy.eyebrow}</Eyebrow>
				<h1 class="text-hero">
					{copy.title}<br /><span class="text-ink-subtle">{copy.soft}</span>
				</h1>
				<p class="text-lead text-ink-muted">{copy.lead}</p>
				<div
					class="mt-2 flex flex-wrap justify-center gap-2 max-[719px]:w-full max-[719px]:flex-col"
				>
					{#if status === 404}
						<Button size="lg" href={resolve('/(site)')}
							>Go home<ArrowRightIcon aria-hidden="true" /></Button
						>
						<Button variant="secondary" size="lg" href={resolve('/(site)/projects')}
							>View projects</Button
						>
						<Button variant="secondary" size="lg" href={resolve('/(site)/blog')}
							>Read the blog</Button
						>
					{:else if status === 429}
						<Button size="lg" href={resolve('/(site)')}>Go home</Button>
					{:else}
						<Button size="lg" onclick={() => location.reload()}>Try again</Button>
						<Button variant="secondary" size="lg" href={resolve('/(site)')}>Go home</Button>
					{/if}
				</div>
				{#if status !== 404 && status !== 429}
					<Button variant="ghost" href={mailto}>Email me about it</Button>
				{/if}
			</div>
		</Section>
	</main>
	<SiteFooter />
</div>

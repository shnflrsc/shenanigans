<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { Button } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';
	import Cover from './cover.svelte';
	import Tag from './tag.svelte';

	type Props = {
		project: {
			slug: string;
			title: string;
			summary: string;
			year: number | null;
			role: string | null;
			coverImage: string | null;
			coverAlt: string | null;
			liveUrl: string | null;
			repoUrl: string | null;
			body: string | null;
			tags: { slug: string; name: string }[];
		};
		/** Image left, body right, larger title. One per page. */
		featured?: boolean;
	};

	let { project, featured = false }: Props = $props();
	const caption = $derived([project.year, project.role].filter(Boolean).join(' · '));
	const href = $derived(resolve('/(site)/projects/[slug]', { slug: project.slug }));
</script>

<article
	class={cn(
		'group/card relative overflow-hidden rounded-lg border border-line bg-paper transition-[background-color,box-shadow] duration-150 ease-out hover:bg-paper-raised hover:shadow-md',
		featured && 'grid min-[720px]:grid-cols-[1.3fr_1fr]'
	)}
>
	<Cover
		path={project.coverImage}
		alt={project.coverAlt}
		class={featured ? 'h-full min-h-[240px]' : ''}
	/>
	<div class={cn('flex flex-col gap-3 p-6', featured && 'justify-center')}>
		{#if caption}<span class="text-caption text-ink-subtle">{caption}</span>{/if}
		<h3
			class={featured
				? 'text-[24px] leading-8 font-semibold tracking-[-0.02em]'
				: 'text-card-title'}
		>
			<!-- The whole card is clickable through this stretched link. -->
			<a {href} class="stretched-link">{project.title}</a>
		</h3>
		<p class="text-small text-ink-muted">{project.summary}</p>
		{#if project.tags.length}
			<ul class="flex flex-wrap gap-2" aria-label="Tags">
				{#each project.tags as tag (tag.slug)}<li><Tag label={tag.name} /></li>{/each}
			</ul>
		{/if}
		<div class="relative z-10 -ml-3 flex flex-wrap gap-1">
			{#if project.body}
				<Button variant="ghost" size="sm" {href}
					>Case study<ArrowRightIcon aria-hidden="true" /></Button
				>
			{/if}
			{#if project.liveUrl}
				<Button variant="ghost" size="sm" href={project.liveUrl}
					>Live site<ExternalLinkIcon aria-hidden="true" /></Button
				>
			{/if}
			{#if project.repoUrl}
				<Button variant="ghost" size="sm" href={project.repoUrl}
					>Source<ExternalLinkIcon aria-hidden="true" /></Button
				>
			{/if}
		</div>
	</div>
</article>

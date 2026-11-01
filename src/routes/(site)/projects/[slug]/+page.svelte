<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { resolve } from '$app/paths';
	import ContactBox from '#lib/components/site/contact-box.svelte';
	import Cover from '#lib/components/site/cover.svelte';
	import Frame from '#lib/components/site/frame.svelte';
	import PostNav from '#lib/components/site/post-nav.svelte';
	import Prose from '#lib/components/site/prose.svelte';
	import Section from '#lib/components/site/section.svelte';
	import Seo from '#lib/components/site/seo.svelte';
	import Tag from '#lib/components/site/tag.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { formatReadTime } from '#lib/format.js';
	import { site } from '#lib/site.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const project = $derived(data.project);

	// Rows with no value are left out (FR-27).
	const facts = $derived(
		[
			{ label: 'Year', value: project.year ? String(project.year) : null },
			{ label: 'My role', value: project.role },
			{ label: 'Team', value: project.team }
		].filter((f): f is { label: string; value: string } => Boolean(f.value))
	);
	const hasLinks = $derived(Boolean(project.liveUrl || project.repoUrl));
	const link = (slug: string, title: string) => ({
		href: resolve('/(site)/projects/[slug]', { slug }),
		title
	});
</script>

<Seo title={project.title} description={project.summary} path={`/projects/${project.slug}`} />

<Section tone="plain" width="narrow" class="pb-12" enter>
	<div class="flex flex-col gap-8">
		<a
			href={resolve('/(site)/projects')}
			class="inline-flex w-fit items-center gap-1 rounded-md text-ui text-ink-subtle hover:text-ink"
		>
			<ArrowLeftIcon class="size-4" aria-hidden="true" />Projects
		</a>

		<header class="flex flex-col gap-4 border-b border-line pb-8">
			{#if project.tags.length}
				<ul class="flex flex-wrap gap-2" aria-label="Tags">
					{#each project.tags as tag (tag.slug)}<li><Tag label={tag.name} /></li>{/each}
				</ul>
			{/if}
			<h1 class="text-post-title max-[719px]:text-[32px] max-[719px]:leading-10">
				{project.title}
			</h1>
			<p class="text-lead text-ink-muted">{project.summary}</p>
			<p class="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-subtle">
				<span>{site.fullName}</span>
				<span>Case study</span>
				{#if data.project.hasBody}<span>{formatReadTime(data.readTime)}</span>{/if}
			</p>
		</header>

		{#if facts.length || hasLinks}
			<Frame>
				<div class="grid grid-cols-2 gap-x-6 gap-y-5 min-[720px]:grid-cols-4">
					<dl class="contents">
						{#each facts as fact (fact.label)}
							<div class="flex flex-col gap-1">
								<dt class="text-caption text-ink-subtle">{fact.label}</dt>
								<dd class="text-small">{fact.value}</dd>
							</div>
						{/each}
					</dl>
					{#if hasLinks}
						<div class="col-span-2 flex flex-wrap items-center gap-1 min-[720px]:col-span-1">
							{#if project.liveUrl}
								<Button variant="secondary" size="sm" href={project.liveUrl}
									>Live site<ExternalLinkIcon aria-hidden="true" /></Button
								>
							{/if}
							{#if project.repoUrl}
								<Button variant="secondary" size="sm" href={project.repoUrl}
									>Source<ExternalLinkIcon aria-hidden="true" /></Button
								>
							{/if}
						</div>
					{/if}
				</div>
			</Frame>
		{/if}

		<Cover
			path={project.coverImage}
			alt={project.coverAlt}
			ratio="16/10"
			eager
			class="rounded-lg border border-line"
		/>

		{#if data.project.hasBody}
			<Prose html={data.html} />
		{/if}

		<PostNav
			label="More projects"
			previous={data.previous ? link(data.previous.slug, data.previous.title) : null}
			next={data.next ? link(data.next.slug, data.next.title) : null}
		/>
	</div>
</Section>

<ContactBox />

<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { resolve } from '$app/paths';
	import ContactBox from '#lib/components/site/contact-box.svelte';
	import Cover from '#lib/components/site/cover.svelte';
	import Frame from '#lib/components/site/frame.svelte';
	import PostNav from '#lib/components/site/post-nav.svelte';
	import Prose from '#lib/components/site/prose.svelte';
	import Section from '#lib/components/site/section.svelte';
	import Seo from '#lib/components/site/seo.svelte';
	import Tag from '#lib/components/site/tag.svelte';
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
	const links = $derived(
		[
			{ label: 'Live site', href: project.liveUrl },
			{ label: 'Source', href: project.repoUrl }
		].filter((l): l is { label: string; href: string } => Boolean(l.href))
	);
	/** The address without the protocol and a trailing slash, for display. */
	const shortUrl = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
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
			<h1
				class="text-post-title [overflow-wrap:anywhere] max-[719px]:text-[32px] max-[719px]:leading-10"
			>
				{project.title}
			</h1>
			<p class="text-lead text-ink-muted">{project.summary}</p>
			<p class="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-subtle">
				<span>{site.fullName}</span>
				{#if data.project.hasBody}<span>{formatReadTime(data.readTime)}</span>{/if}
			</p>
			{#if project.tags.length}
				<ul class="flex flex-wrap gap-2" aria-label="Tags">
					{#each project.tags as tag (tag.slug)}<li><Tag label={tag.name} /></li>{/each}
				</ul>
			{/if}
			{#if facts.length || links.length}
				<Frame>
					<div class="flex flex-col gap-5">
						<!-- Year, role and team in one row; the links in a second row, in the same label and value format. -->
						{#if facts.length}
							<dl class="flex flex-wrap gap-x-10 gap-y-5">
								{#each facts as fact (fact.label)}
									<div class="flex flex-col gap-1">
										<dt class="text-caption text-ink-subtle">{fact.label}</dt>
										<dd class="text-small">{fact.value}</dd>
									</div>
								{/each}
							</dl>
						{/if}
						{#if links.length}
							<dl class="flex flex-wrap gap-x-10 gap-y-5">
								{#each links as item (item.label)}
									<div class="flex min-w-0 flex-col gap-1">
										<dt class="text-caption text-ink-subtle">{item.label}</dt>
										<dd class="min-w-0 text-small">
											<!-- eslint-disable svelte/no-navigation-without-resolve -- external project links -->
											<a
												href={item.href}
												target="_blank"
												rel="noopener noreferrer"
												class="block truncate rounded-sm underline underline-offset-4 hover:text-ink-muted"
												>{shortUrl(item.href)}</a
											>
										</dd>
									</div>
								{/each}
							</dl>
						{/if}
					</div>
				</Frame>
			{/if}
		</header>

		{#if project.coverImage}
			<Cover
				path={project.coverImage}
				alt={project.coverAlt}
				ratio="16/10"
				eager
				sizes="(min-width: 768px) 720px, 100vw"
				class="rounded-lg border border-line"
			/>
		{/if}

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

<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { resolve } from '$app/paths';
	import Cover from '#lib/components/site/cover.svelte';
	import PostNav from '#lib/components/site/post-nav.svelte';
	import ProjectCard from '#lib/components/site/project-card.svelte';
	import Prose from '#lib/components/site/prose.svelte';
	import Section from '#lib/components/site/section.svelte';
	import Seo from '#lib/components/site/seo.svelte';
	import Tag from '#lib/components/site/tag.svelte';
	import { formatDate, formatReadTime } from '#lib/format.js';
	import { site } from '#lib/site.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const post = $derived(data.post);

	const link = (slug: string, title: string) => ({
		href: resolve('/(site)/blog/[slug]', { slug }),
		title
	});
</script>

<Seo
	title={post.title}
	description={post.excerpt}
	path={`/blog/${post.slug}`}
	image={`/og/${post.slug}.png`}
	type="article"
	publishedTime={post.publishedAt}
/>

<Section width="narrow" class="pb-12">
	<div class="flex flex-col gap-8">
		<a
			href={resolve('/(site)/blog')}
			class="inline-flex w-fit items-center gap-1 rounded-md text-ui text-ink-subtle hover:text-ink"
		>
			<ArrowLeftIcon class="size-4" aria-hidden="true" />Blog
		</a>

		<header data-enter class="flex flex-col gap-4 border-b border-line pb-8">
			{#if post.tags.length}
				<ul class="flex flex-wrap gap-2" aria-label="Tags">
					{#each post.tags as tag (tag.slug)}
						<li>
							<Tag
								label={tag.name}
								href={`${resolve('/(site)/blog')}?tag=${encodeURIComponent(tag.slug)}`}
							/>
						</li>
					{/each}
				</ul>
			{/if}
			<h1 class="text-post-title max-[719px]:text-[32px] max-[719px]:leading-10">{post.title}</h1>
			<p class="text-lead text-ink-muted">{post.excerpt}</p>
			<p class="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-subtle">
				<span>{site.fullName}</span>
				{#if post.publishedAt}<span>{formatDate(post.publishedAt)}</span>{/if}
				<span>{formatReadTime(data.readTime)}</span>
			</p>
		</header>

		{#if post.coverImage}
			<Cover
				path={post.coverImage}
				alt={post.coverAlt}
				ratio="16/9"
				eager
				class="rounded-lg border border-line"
			/>
		{/if}

		<Prose html={data.html} />
	</div>
</Section>

{#if data.project}
	<Section tone="soft" class="py-16">
		<div class="flex flex-col gap-6">
			<h2 class="text-card-title">The project this post is about</h2>
			<ProjectCard project={data.project} featured />
		</div>
	</Section>
{/if}

<Section width="narrow" class="py-12">
	<PostNav
		label="More posts"
		previous={data.older ? link(data.older.slug, data.older.title) : null}
		next={data.newer ? link(data.newer.slug, data.newer.title) : null}
	/>
</Section>

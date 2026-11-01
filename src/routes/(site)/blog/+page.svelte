<script lang="ts">
	import { resolve } from '$app/paths';
	import EmptyCard from '#lib/components/site/empty-card.svelte';
	import FilterTags from '#lib/components/site/filter-tags.svelte';
	import PostCard from '#lib/components/site/post-card.svelte';
	import Section from '#lib/components/site/section.svelte';
	import SectionTitle from '#lib/components/site/section-title.svelte';
	import Seo from '#lib/components/site/seo.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Filters are hidden until there are two or more posts.
	const showFilters = $derived(data.totalAll >= 2 && data.tags.length > 0);

	const pageHref = (n: number) => {
		const parts = [
			...(data.tag ? [`tag=${encodeURIComponent(data.tag)}`] : []),
			...(n > 1 ? [`page=${n}`] : [])
		];
		return parts.length ? `${resolve('/(site)/blog')}?${parts.join('&')}` : resolve('/(site)/blog');
	};
</script>

<Seo
	title="Blog"
	description="What I learn while building: guides, project write-ups and notes."
	path="/blog"
/>

<Section width="narrow" enter>
	<div class="flex flex-col gap-8">
		<SectionTitle tag="h1" soft="What I learn while building.">Blog.</SectionTitle>

		{#if data.totalAll === 0}
			<EmptyCard variant="soft" title="Nothing here yet" />
		{:else}
			{#if showFilters}
				<FilterTags
					label="Filter posts by tag"
					tags={data.tags}
					total={data.totalAll}
					active={data.tag}
					base="/(site)/blog"
				/>
			{/if}
			<div class="flex flex-col border-t border-line">
				{#each data.posts as post (post.slug)}
					<PostCard {post} readTime={post.readTime} level={2} />
				{/each}
			</div>

			{#if data.pages > 1}
				<nav aria-label="Pagination" class="flex items-center justify-between gap-4">
					{#if data.page > 1}
						<Button variant="secondary" href={pageHref(data.page - 1)}>Newer posts</Button>
					{:else}
						<span></span>
					{/if}
					<span class="text-caption text-ink-subtle">Page {data.page} of {data.pages}</span>
					{#if data.page < data.pages}
						<Button variant="secondary" href={pageHref(data.page + 1)}>Older posts</Button>
					{:else}
						<span></span>
					{/if}
				</nav>
			{/if}
		{/if}
	</div>
</Section>

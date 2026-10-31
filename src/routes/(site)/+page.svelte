<script lang="ts">
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { resolve } from '$app/paths';
	import AboutSection from '#lib/components/site/about-section.svelte';
	import ContactBox from '#lib/components/site/contact-box.svelte';
	import EmptyCard from '#lib/components/site/empty-card.svelte';
	import Hero from '#lib/components/site/hero.svelte';
	import PostCard from '#lib/components/site/post-card.svelte';
	import ProjectCard from '#lib/components/site/project-card.svelte';
	import Section from '#lib/components/site/section.svelte';
	import Seo from '#lib/components/site/seo.svelte';
	import SectionTitle from '#lib/components/site/section-title.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { site } from '#lib/site.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Launch rules: "view all" links need at least two items to be worth showing.
	const moreProjects = $derived(data.counts.projects >= 2);
	const morePosts = $derived(data.counts.posts >= 2);
</script>

<Seo description={site.description} path="/" />

<Hero />
<AboutSection />

<Section tone="soft">
	<div class="flex flex-col gap-8">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<SectionTitle>Featured</SectionTitle>
			{#if moreProjects}
				<Button variant="ghost" href={resolve('/(site)/projects')}
					>All projects<ArrowRightIcon aria-hidden="true" /></Button
				>
			{/if}
		</div>
		{#if data.featured}
			<ProjectCard project={data.featured} featured />
			{#if data.counts.projects === 1}
				<p class="text-small text-ink-subtle">More projects are on the way.</p>
			{/if}
		{:else}
			<EmptyCard
				eyebrow="Featured"
				title="Nothing featured right now"
				text="I’m choosing which project to spotlight next. Everything I’ve shipped is on the Projects page."
			>
				<Button variant="secondary" href={resolve('/(site)/projects')}>See all projects</Button>
			</EmptyCard>
		{/if}
	</div>
</Section>

<Section>
	<div class="flex flex-col gap-8">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<SectionTitle>Latest posts</SectionTitle>
			{#if morePosts}
				<Button variant="ghost" href={resolve('/(site)/blog')}
					>All posts<ArrowRightIcon aria-hidden="true" /></Button
				>
			{/if}
		</div>
		{#if data.posts.length}
			<div class="flex flex-col">
				{#each data.posts as post (post.slug)}
					<PostCard {post} readTime={post.readTime} />
				{/each}
			</div>
			{#if data.counts.posts === 1}
				<p class="text-small text-ink-subtle">That’s the first one. More soon.</p>
			{/if}
		{:else}
			<EmptyCard
				eyebrow="Blog"
				title="No posts yet"
				text="The first one is in the works. It will show up here as soon as it’s published."
			/>
		{/if}
	</div>
</Section>

<ContactBox />

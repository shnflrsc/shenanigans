<script lang="ts">
	import EmptyCard from '#lib/components/site/empty-card.svelte';
	import FilterTags from '#lib/components/site/filter-tags.svelte';
	import ProjectCard from '#lib/components/site/project-card.svelte';
	import Section from '#lib/components/site/section.svelte';
	import SectionTitle from '#lib/components/site/section-title.svelte';
	import Seo from '#lib/components/site/seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Filters are hidden until there are two or more projects.
	const showFilters = $derived(data.total >= 2 && data.tags.length > 0);
</script>

<Seo
	title="Projects"
	description="Things I have built: case studies of my projects, what I did and what I would change."
	path="/projects"
/>

<Section>
	<div class="flex flex-col gap-8">
		<SectionTitle tag="h1" soft="Things I have built.">Projects.</SectionTitle>

		{#if data.total === 0}
			<EmptyCard variant="soft" title="No projects yet" />
		{:else}
			{#if showFilters}
				<FilterTags
					label="Filter projects by tag"
					tags={data.tags}
					total={data.total}
					active={data.tag}
					base="/(site)/projects"
				/>
			{/if}
			{#if data.total === 1}
				<ProjectCard project={data.projects[0]} featured />
				<p class="text-small text-ink-subtle">That’s the first one. More soon.</p>
			{:else}
				<ul data-reveal-group class="grid gap-6 min-[720px]:grid-cols-2">
					{#each data.projects as project (project.slug)}
						<li class="flex"><div class="w-full"><ProjectCard {project} /></div></li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</Section>

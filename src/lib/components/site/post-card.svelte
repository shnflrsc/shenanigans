<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDate, formatReadTime } from '#lib/format.js';
	import Tag from './tag.svelte';

	type Props = {
		post: {
			slug: string;
			title: string;
			excerpt: string;
			publishedAt: Date | string | null;
			tags: { slug: string; name: string }[];
		};
		readTime: number;
	};

	let { post, readTime }: Props = $props();
</script>

<!-- Row layout: mono date column, title, excerpt, tags and read time, hairline below (DESIGN.md PostCard). -->
<article
	class="relative grid gap-x-6 gap-y-1 border-b border-line py-6 transition-colors duration-150 hover:bg-fill-hover min-[720px]:grid-cols-[112px_1fr]"
>
	<span class="pt-1 text-caption text-ink-subtle">
		{post.publishedAt ? formatDate(post.publishedAt) : ''}
	</span>
	<div class="flex flex-col gap-2">
		<h3 class="text-card-title">
			<a href={resolve('/(site)/blog/[slug]', { slug: post.slug })} class="stretched-link"
				>{post.title}</a
			>
		</h3>
		<p class="text-small text-ink-muted">{post.excerpt}</p>
		<div class="flex flex-wrap items-center gap-2">
			{#each post.tags as tag (tag.slug)}<Tag label={tag.name} />{/each}
			<span class="text-caption text-ink-subtle">{formatReadTime(readTime)}</span>
		</div>
	</div>
</article>

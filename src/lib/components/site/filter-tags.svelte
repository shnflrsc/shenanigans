<script lang="ts">
	import { resolve } from '$app/paths';
	import Tag from './tag.svelte';

	type Props = {
		tags: { slug: string; name: string; count: number }[];
		total: number;
		active: string | null;
		/** Which index the chips filter. */
		base: '/(site)/projects' | '/(site)/blog';
		label: string;
	};

	let { tags, total, active, base, label }: Props = $props();
</script>

<!-- URL-based filters: shareable and rendered on the server (D5). -->
<ul class="flex flex-wrap gap-2" aria-label={label}>
	<li><Tag label="All" count={total} href={resolve(base)} active={active === null} /></li>
	{#each tags as tag (tag.slug)}
		<li>
			<Tag
				label={tag.name}
				count={tag.count}
				href={`${resolve(base)}?tag=${encodeURIComponent(tag.slug)}`}
				active={active === tag.slug}
			/>
		</li>
	{/each}
</ul>

<script lang="ts">
	import { site } from '#lib/site.js';

	type Props = {
		/** Page title without the site name. Omit on Home, which uses the full tagline. */
		title?: string;
		description: string;
		/** URL path of this page, for the canonical URL, for example "/blog/hello". */
		path: string;
		/** Absolute or site-relative path of the preview image (FR-32). */
		image?: string;
		type?: 'website' | 'article';
		publishedTime?: Date | string | null;
	};

	let {
		title,
		description,
		path,
		image = '/og/site.png',
		type = 'website',
		publishedTime
	}: Props = $props();

	const fullTitle = $derived(
		title ? `${title} · ${site.name}` : `${site.name}: ${site.owner}’s portfolio and blog`
	);
	const url = $derived(`${site.origin}${path === '/' ? '' : path}` || site.origin);
	const imageUrl = $derived(image.startsWith('http') ? image : `${site.origin}${image}`);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />

	<meta property="og:site_name" content={site.name} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	{#if type === 'article' && publishedTime}
		<meta property="article:published_time" content={new Date(publishedTime).toISOString()} />
	{/if}

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
</svelte:head>

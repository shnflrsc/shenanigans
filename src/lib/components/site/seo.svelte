<script lang="ts">
	import { PUBLIC_SUPABASE_URL } from '$app/env/public';
	import { imageUrl, optimizedUrl } from '#lib/format.js';
	import { serializeLd } from '#lib/seo/json-ld.js';
	import { site } from '#lib/site.js';

	type Props = {
		/** Page title without the site name. Omit on Home, which uses the full tagline. */
		title?: string;
		description: string;
		/** URL path of this page, for the canonical URL, for example "/blog/hello". */
		path: string;
		/** Absolute or site-relative path of the preview image (FR-32). */
		image?: string;
		/** An uploaded cover, used as the preview image instead of `image` (M12-6). */
		cover?: { path: string | null; alt: string | null };
		/** Structured data (M12-3), one object or a list. */
		jsonLd?: Record<string, unknown> | Record<string, unknown>[];
		type?: 'website' | 'article';
		/** Filtered and later pages of a list: reachable and shareable, but not indexed on their own (M12-5). */
		noindex?: boolean;
		publishedTime?: Date | string | null;
	};

	let {
		title,
		description,
		path,
		image = '/og/site.png',
		cover,
		jsonLd,
		type = 'website',
		noindex = false,
		publishedTime
	}: Props = $props();

	const fullTitle = $derived(
		title ? `${title} · ${site.name}` : `${site.name}: ${site.owner}’s portfolio and blog`
	);
	const url = $derived(`${site.origin}${path === '/' ? '' : path}` || site.origin);
	// A cover is shown as uploaded, resized by the image optimizer on Vercel; its shape is its own, so no 1200 x 630 is claimed.
	const coverUrl = $derived.by(() => {
		if (!cover?.path) return null;
		const original = imageUrl(PUBLIC_SUPABASE_URL, cover.path);
		return __OPTIMIZE_IMAGES__ && !/.gif$/i.test(cover.path)
			? `${site.origin}${optimizedUrl(original, 1280)}`
			: original;
	});
	const previewUrl = $derived(
		coverUrl ?? (image.startsWith('http') ? image : `${site.origin}${image}`)
	);
	const previewAlt = $derived(coverUrl ? cover?.alt || fullTitle : fullTitle);
	// The closing tag is written in two pieces so it does not end this script block.
	const ldScript = $derived(
		jsonLd ? `<script type="application/ld+json">${serializeLd(jsonLd)}<` + `/script>` : ''
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	{#if noindex}<meta name="robots" content="noindex, follow" />{/if}

	<meta property="og:site_name" content={site.name} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={previewUrl} />
	<meta property="og:image:alt" content={previewAlt} />
	{#if !coverUrl}
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
	{/if}
	{#if type === 'article' && publishedTime}
		<meta property="article:published_time" content={new Date(publishedTime).toISOString()} />
	{/if}

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={previewUrl} />
	<meta name="twitter:image:alt" content={previewAlt} />

	{#if jsonLd}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- built from the site's own data and escaped by serializeLd() -->
		{@html ldScript}
	{/if}
</svelte:head>

<script lang="ts">
	import { PUBLIC_SUPABASE_URL } from '$app/env/public';
	import { cn } from '#lib/utils.js';
	import { IMAGE_WIDTHS, imageUrl, optimizedUrl } from '#lib/format.js';

	type Props = {
		/** Storage path, not a full URL (3.2). */
		path: string | null | undefined;
		alt?: string | null;
		/** 16:10 for projects, 16:9 for posts. */
		ratio?: '16/10' | '16/9';
		eager?: boolean;
		/** How wide the image is shown, so the browser picks a fitting size. */
		sizes?: string;
		class?: string;
	};

	let {
		path,
		alt,
		ratio = '16/10',
		eager = false,
		sizes = '(min-width: 1024px) 480px, 100vw',
		class: className
	}: Props = $props();
	let failed = $state(false);

	const original = $derived(path ? imageUrl(PUBLIC_SUPABASE_URL, path) : '');
	// GIFs stay as uploaded: the optimizer would flatten an animation.
	const optimized = $derived(__OPTIMIZE_IMAGES__ && !path?.toLowerCase().endsWith('.gif'));

	// An `onerror` attribute would be rendered into the page as an inline handler, which the strict CSP blocks (SR-10).
	// This runs in the browser instead, and also catches an image that failed before the page was ready.
	function watchForFailure(img: HTMLImageElement) {
		const fail = () => (failed = true);
		if (img.complete && img.naturalWidth === 0) fail();
		img.addEventListener('error', fail);
		return () => img.removeEventListener('error', fail);
	}
</script>

<!-- A missing or broken cover falls back to the muted placeholder, so content is never blocked on an image. -->
<div
	class={cn(
		'relative overflow-hidden bg-fill-muted',
		ratio === '16/10' ? 'aspect-[16/10]' : 'aspect-video',
		className
	)}
>
	{#if path && !failed}
		<img
			src={optimized ? optimizedUrl(original, 1024) : original}
			srcset={optimized
				? IMAGE_WIDTHS.map((w) => `${optimizedUrl(original, w)} ${w}w`).join(', ')
				: undefined}
			sizes={optimized ? sizes : undefined}
			alt={alt ?? ''}
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			class="size-full object-cover text-transparent transition-transform duration-200 ease-out group-hover/card:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
			{@attach watchForFailure}
		/>
	{/if}
	<div aria-hidden="true" class="absolute inset-0 bg-image-overlay"></div>
</div>

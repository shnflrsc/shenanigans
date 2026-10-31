<script lang="ts">
	import { PUBLIC_SUPABASE_URL } from '$app/env/public';
	import { cn } from '#lib/utils.js';
	import { imageUrl } from '#lib/format.js';

	type Props = {
		/** Storage path, not a full URL (3.2). */
		path: string | null | undefined;
		alt?: string | null;
		/** 16:10 for projects, 16:9 for posts. */
		ratio?: '16/10' | '16/9';
		eager?: boolean;
		class?: string;
	};

	let { path, alt, ratio = '16/10', eager = false, class: className }: Props = $props();
	let failed = $state(false);
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
			src={imageUrl(PUBLIC_SUPABASE_URL, path)}
			alt={alt ?? ''}
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			class="size-full object-cover text-transparent transition-transform duration-200 ease-out group-hover/card:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
			onerror={() => (failed = true)}
		/>
	{/if}
	<div aria-hidden="true" class="absolute inset-0 bg-image-overlay"></div>
</div>

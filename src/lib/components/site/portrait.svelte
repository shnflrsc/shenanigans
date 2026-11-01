<script lang="ts">
	import { site } from '#lib/site.js';

	// The photo is a static asset (PLAN.md H7). Until it exists, a muted tile stands in.
	const found = import.meta.glob('/src/lib/assets/portrait.{jpg,jpeg,png,webp}', {
		eager: true,
		query: { enhanced: true }
	}) as Record<string, { default: string }>;
	const portrait = Object.values(found)[0]?.default;
</script>

<figure class="flex flex-1 basis-[300px] flex-col gap-4 min-[720px]:max-w-[300px]">
	<div class="relative aspect-[4/5] overflow-hidden rounded-lg border border-line bg-fill-muted">
		{#if portrait}
			<!-- Above the fold: loaded right away, not lazily (PR-3). -->
			<enhanced:img
				src={portrait}
				alt={`Portrait of ${site.fullName}`}
				loading="eager"
				fetchpriority="high"
				class="size-full object-cover object-[center_30%] text-transparent grayscale"
			/>
		{/if}
		<div aria-hidden="true" class="absolute inset-0 bg-image-overlay"></div>
	</div>
	<figcaption class="flex flex-col gap-1">
		<span class="text-card-title">{site.fullName}</span>
		<span class="text-caption text-ink-subtle">{site.caption}</span>
	</figcaption>
</figure>

<script lang="ts">
	import { cn } from '#lib/utils.js';

	/** Published: muted fill and a filled dot. Draft: outline and a hollow dot. They differ in shape, not just shade. */
	let { status }: { status: 'draft' | 'published' } = $props();
</script>

<span
	class={cn(
		'inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-[12px] font-medium',
		status === 'published'
			? 'bg-fill-muted text-ink-muted'
			: 'border border-line-strong bg-paper text-ink-muted'
	)}
>
	<span
		aria-hidden="true"
		class={cn(
			'size-1.5 rounded-full',
			status === 'published' ? 'bg-ink' : 'border border-ink-muted bg-transparent'
		)}
	></span>
	{status === 'published' ? 'Published' : 'Draft'}
</span>

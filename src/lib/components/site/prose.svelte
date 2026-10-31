<script lang="ts">
	/**
	 * Wraps rendered markdown. `html` must come from renderMarkdown(), the one shared function that
	 * sanitizes before it adds any markup (SR-8, SR-13). This is the only place {@html} is used for content.
	 */
	let { html }: { html: string } = $props();
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized by renderMarkdown(), see the comment above -->
<div class="prose-shenanigans">{@html html}</div>

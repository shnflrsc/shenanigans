<script lang="ts">
	import PostEditor from '#lib/components/admin/post-editor.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- Keyed so moving between posts (or from "new" to the saved post) starts a fresh editor. -->
{#key data.post?.id ?? 'new'}
	<PostEditor {data} />
{/key}

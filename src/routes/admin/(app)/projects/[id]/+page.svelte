<script lang="ts">
	import ProjectEditor from '#lib/components/admin/project-editor.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#key data.project?.id ?? 'new'}
	<ProjectEditor {data} />
{/key}

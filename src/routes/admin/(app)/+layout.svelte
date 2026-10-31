<script lang="ts">
	import AdminShell from '#lib/components/admin/admin-shell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<AdminShell counts={data.counts}>
	{@render children()}
</AdminShell>

<script lang="ts">
	import LoginCard from '#lib/components/admin/login-card.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const status = $derived(form?.notice ?? data.notice ?? 'default');
</script>

<svelte:head>
	<title>Admin sign in</title>
</svelte:head>

<LoginCard {status} />

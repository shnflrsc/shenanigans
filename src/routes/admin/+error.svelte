<script lang="ts">
	import { page } from '$app/state';
	import LoginCard from '#lib/components/admin/login-card.svelte';
</script>

<svelte:head>
	<title>Admin sign in</title>
</svelte:head>

{#if page.status === 429}
	<LoginCard status="rate-limited" />
{:else}
	<LoginCard status="error" />
{/if}

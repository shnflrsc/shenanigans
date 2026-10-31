<script lang="ts">
	import { page } from '$app/state';
	import ErrorPage from '#lib/components/site/error-page.svelte';
</script>

<ErrorPage status={page.status} />

<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import ConfirmDialog from './confirm-dialog.svelte';

	/**
	 * Warns before leaving with unsaved changes: refresh, closing the tab, back, or a link inside the
	 * dashboard (FR-21). Keep editing is the primary choice.
	 */
	let { dirty }: { dirty: boolean } = $props();

	let open = $state(false);
	let pending = $state<URL | null>(null);
	let allowed = false;

	beforeNavigate((navigation) => {
		if (!dirty || allowed) return;
		if (navigation.type === 'leave') {
			// Refresh or closing the tab: the browser shows its own prompt.
			navigation.cancel();
			return;
		}
		navigation.cancel();
		pending = navigation.to?.url ?? null;
		open = true;
	});
</script>

<svelte:window
	onbeforeunload={(event) => {
		if (!dirty) return;
		event.preventDefault();
		// Some browsers need a value set; the text itself is never shown.
		event.returnValue = '';
	}}
/>

<ConfirmDialog
	bind:open
	title="Leave without saving?"
	confirmLabel="Leave anyway"
	cancelLabel="Keep editing"
	primary="cancel"
	oncancel={() => (pending = null)}
	onconfirm={async () => {
		if (!pending) return;
		allowed = true;
		const target = pending;
		pending = null;
		// The target came from SvelteKit's own navigation, so it is already a resolved URL.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(target);
		allowed = false;
	}}
>
	You have unsaved changes. If you leave now, they will be lost.
</ConfirmDialog>

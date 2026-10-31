<script lang="ts">
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	type Props = {
		open: boolean;
		/** The markdown to offer for copying, so nothing typed can be lost. */
		markdown: string;
		/** Called when the admin has signed in again in the other tab and wants to try the save again. */
		onretry: () => void;
	};

	let { open = $bindable(), markdown, onretry }: Props = $props();

	async function copy() {
		try {
			await navigator.clipboard.writeText(markdown);
			toast.success('Markdown copied.');
		} catch {
			toast.error('Could not copy. Select the text in the editor and copy it by hand.');
		}
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Your session expired</AlertDialog.Title>
			<AlertDialog.Description>
				Nothing you typed is lost. Sign in again, then come back here and save. Signing in opens in
				a new tab so this page stays as it is.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<Button variant="secondary" onclick={copy}>Copy markdown</Button>
			<form method="POST" action={resolve('/admin')} target="_blank" class="contents">
				<input type="hidden" name="intent" value="signin" />
				<Button type="submit" formaction="/admin?/signin">Continue with GitHub</Button>
			</form>
			<Button variant="ghost" onclick={onretry}>I signed in, try again</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	type Props = {
		open: boolean;
		title: string;
		/** Explicit verb for the confirm button: destructive actions use the primary button, never red. */
		confirmLabel: string;
		cancelLabel?: string;
		/** Which button is the primary one. Leaving with unsaved changes makes the safe choice (Keep editing) primary. */
		primary?: 'confirm' | 'cancel';
		onconfirm: () => void | Promise<void>;
		oncancel?: () => void;
		children: Snippet;
	};

	let {
		open = $bindable(),
		title,
		confirmLabel,
		cancelLabel = 'Cancel',
		primary = 'confirm',
		onconfirm,
		oncancel,
		children
	}: Props = $props();
	let busy = $state(false);
</script>

<AlertDialog.Root
	bind:open
	onOpenChange={(value) => {
		if (!value) oncancel?.();
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{@render children()}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>
				{#snippet child({ props })}
					<Button {...props} variant={primary === 'cancel' ? 'default' : 'secondary'}>
						{cancelLabel}
					</Button>
				{/snippet}
			</AlertDialog.Cancel>
			<AlertDialog.Action>
				{#snippet child({ props })}
					<Button
						{...props}
						variant={primary === 'confirm' ? 'default' : 'secondary'}
						disabled={busy}
						onclick={async () => {
							busy = true;
							try {
								await onconfirm();
							} finally {
								busy = false;
								open = false;
							}
						}}
					>
						{confirmLabel}
					</Button>
				{/snippet}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

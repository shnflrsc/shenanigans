<script lang="ts">
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';
	import LoaderIcon from '@lucide/svelte/icons/loader-circle';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { PUBLIC_SUPABASE_URL } from '$app/env/public';
	import { imageUrl } from '#lib/format.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';
	import Field from './field.svelte';

	type Props = {
		id: string;
		/** Storage path of the uploaded image, or empty. */
		path: string;
		alt: string;
		altError?: string;
		/** When set, the field shows the alt text input too (covers need it). */
		showAlt?: boolean;
		/** Called after a successful upload with the path and public URL. */
		onuploaded?: (result: { path: string; url: string }) => void;
	};

	let {
		id,
		path = $bindable(),
		alt = $bindable(),
		altError,
		showAlt = true,
		onuploaded
	}: Props = $props();

	type Phase = 'idle' | 'dragging' | 'uploading' | 'failed';
	let phase = $state<Phase>('idle');
	let message = $state('');
	let controller: AbortController | null = null;
	let lastFile = $state<File | null>(null);
	let input = $state<HTMLInputElement | null>(null);
	let fileName = $state('');

	async function upload(file: File) {
		lastFile = file;
		fileName = file.name;
		phase = 'uploading';
		controller = new AbortController();
		const body = new FormData();
		body.set('file', file);
		try {
			const response = await fetch('/admin/upload', {
				method: 'POST',
				body,
				signal: controller.signal
			});
			const result = (await response.json().catch(() => ({}))) as {
				path?: string;
				url?: string;
				message?: string;
			};
			if (!response.ok || !result.path || !result.url) {
				phase = 'failed';
				message =
					response.status === 401
						? 'Your session expired. Sign in again to upload.'
						: (result.message ?? 'The upload failed. Try again.');
				return;
			}
			path = result.path;
			phase = 'idle';
			onuploaded?.({ path: result.path, url: result.url });
		} catch (error) {
			if ((error as Error).name === 'AbortError') {
				phase = 'idle';
				return;
			}
			phase = 'failed';
			message = 'Could not reach the server. Check your connection and try again.';
		}
	}

	function pick(files: FileList | null | undefined) {
		const file = files?.[0];
		if (file) void upload(file);
	}
</script>

<div class="flex flex-col gap-3">
	{#if path && phase !== 'uploading'}
		<div class="flex flex-col gap-3">
			<div
				class="relative aspect-[16/10] overflow-hidden rounded-lg border border-line bg-fill-muted"
			>
				<img src={imageUrl(PUBLIC_SUPABASE_URL, path)} alt="" class="size-full object-cover" />
				<div aria-hidden="true" class="absolute inset-0 bg-image-overlay"></div>
			</div>
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" onclick={() => input?.click()}>Replace</Button>
				<Button
					variant="ghost"
					size="sm"
					onclick={() => {
						path = '';
						alt = '';
					}}>Remove</Button
				>
			</div>
			{#if showAlt}
				<Field id="{id}-alt" label="Alt text" error={altError}>
					{#snippet children({ describedby, invalid })}
						<input
							id="{id}-alt"
							type="text"
							bind:value={alt}
							aria-describedby={describedby}
							aria-invalid={invalid}
							class={cn(
								'h-9 w-full rounded-md border border-line-strong bg-paper px-3 text-ui',
								invalid && 'ring-2 ring-ink'
							)}
						/>
					{/snippet}
				</Field>
			{/if}
		</div>
	{:else if phase === 'uploading'}
		<div class="flex flex-col gap-2 rounded-lg border border-line bg-paper-soft p-3">
			<div class="flex items-center justify-between gap-2 text-small">
				<span class="flex min-w-0 items-center gap-2"
					><LoaderIcon class="size-4 shrink-0 animate-spin" aria-hidden="true" /><span
						class="truncate">Uploading {fileName}</span
					></span
				>
				<Button variant="ghost" size="sm" onclick={() => controller?.abort()}>Cancel</Button>
			</div>
			<div
				class="h-1 overflow-hidden rounded-full bg-fill-muted"
				role="progressbar"
				aria-label="Uploading"
			>
				<div class="h-full w-1/3 animate-pulse rounded-full bg-ink"></div>
			</div>
		</div>
	{:else}
		{#if phase === 'failed'}
			<div role="alert" class="flex items-start gap-2 rounded-md border border-ink p-3 text-small">
				<AlertCircleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<div class="flex flex-col gap-2">
					<span>{message}</span>
					<span class="flex gap-2">
						{#if lastFile}<Button
								variant="secondary"
								size="sm"
								onclick={() => lastFile && upload(lastFile)}>Try again</Button
							>{/if}
						<Button variant="ghost" size="sm" onclick={() => input?.click()}>Choose another</Button>
					</span>
				</div>
			</div>
		{/if}
		<!-- Drop zone: dashed line on paper-soft; solid ink border while dragging over it. -->
		<button
			type="button"
			class={cn(
				'flex flex-col items-center gap-1.5 rounded-lg border bg-paper-soft p-6 text-center text-small',
				phase === 'dragging'
					? 'border-solid border-ink bg-fill-hover'
					: 'border-dashed border-line-strong'
			)}
			onclick={() => input?.click()}
			ondragover={(event) => {
				event.preventDefault();
				phase = 'dragging';
			}}
			ondragleave={() => (phase = phase === 'dragging' ? 'idle' : phase)}
			ondrop={(event) => {
				event.preventDefault();
				pick(event.dataTransfer?.files);
			}}
		>
			<UploadIcon class="size-5 text-ink-subtle" aria-hidden="true" />
			<span class="font-medium">Choose an image or drop it here</span>
			<span class="text-[12px] text-ink-subtle">JPEG, PNG, WebP, GIF or AVIF, up to 5 MB</span>
		</button>
	{/if}

	<input
		bind:this={input}
		{id}
		type="file"
		accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
		class="sr-only"
		tabindex="-1"
		aria-label="Choose an image file"
		onchange={(event) => {
			pick(event.currentTarget.files);
			event.currentTarget.value = '';
		}}
	/>
</div>

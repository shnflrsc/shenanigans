<script lang="ts">
	import BoldIcon from '@lucide/svelte/icons/bold';
	import CodeIcon from '@lucide/svelte/icons/code';
	import HeadingIcon from '@lucide/svelte/icons/heading-2';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ItalicIcon from '@lucide/svelte/icons/italic';
	import LinkIcon from '@lucide/svelte/icons/link';
	import ListIcon from '@lucide/svelte/icons/list';
	import QuoteIcon from '@lucide/svelte/icons/quote';
	import type { Component } from 'svelte';
	import { untrack } from 'svelte';
	import ImageField from './image-field.svelte';
	import Prose from '#lib/components/site/prose.svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	type Props = {
		id: string;
		label: string;
		value: string;
	};

	let { id, label, value = $bindable() }: Props = $props();

	// The Image button opens an uploader under the toolbar; the result goes in at the cursor as ![alt](url) (FR-13).
	let imageOpen = $state(false);
	let imagePath = $state('');
	let imageAlt = $state('');
	let imageUrl = $state('');
	let imageError = $state('');
	let cursor = { start: 0, end: 0 };

	function openImage() {
		cursor = {
			start: textarea?.selectionStart ?? value.length,
			end: textarea?.selectionEnd ?? value.length
		};
		imagePath = '';
		imageAlt = '';
		imageUrl = '';
		imageError = '';
		imageOpen = true;
	}

	function insertImage() {
		const alt = imageAlt.trim();
		if (!alt) {
			imageError = 'Add alt text for the image';
			return;
		}
		// Brackets in alt text would end the markdown early.
		const safeAlt = alt.replace(/[[\]]/g, '');
		textarea?.setSelectionRange(cursor.start, cursor.end);
		insert('\n![' + safeAlt + '](' + imageUrl + ')\n', '', '');
		imageOpen = false;
	}

	let textarea = $state<HTMLTextAreaElement | null>(null);
	let html = $state('');
	let previewFailed = $state(false);

	// Live preview through the same render function as the public pages (SR-13), debounced.
	$effect(() => {
		const markdown = value;
		const timer = setTimeout(async () => {
			try {
				const response = await fetch('/admin/preview', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ markdown })
				});
				if (!response.ok) throw new Error(String(response.status));
				const result = (await response.json()) as { html: string };
				untrack(() => {
					html = result.html;
					previewFailed = false;
				});
			} catch {
				untrack(() => (previewFailed = true));
			}
		}, 250);
		return () => clearTimeout(timer);
	});

	/** Wraps the selection (or inserts a placeholder) and keeps the cursor useful. */
	export function insert(before: string, after = '', placeholder = '') {
		const el = textarea;
		if (!el) return;
		const { selectionStart: start, selectionEnd: end } = el;
		const selected = value.slice(start, end) || placeholder;
		value = value.slice(0, start) + before + selected + after + value.slice(end);
		requestAnimationFrame(() => {
			el.focus();
			el.setSelectionRange(start + before.length, start + before.length + selected.length);
		});
	}

	const tools: { label: string; icon: Component; run: () => void }[] = [
		{ label: 'Heading', icon: HeadingIcon, run: () => insert('\n## ', '', 'Heading') },
		{ label: 'Bold', icon: BoldIcon, run: () => insert('**', '**', 'bold') },
		{ label: 'Italic', icon: ItalicIcon, run: () => insert('_', '_', 'italic') },
		{ label: 'Link', icon: LinkIcon, run: () => insert('[', '](https://)', 'link text') },
		{ label: 'Code', icon: CodeIcon, run: () => insert('\n```ts\n', '\n```\n', 'code') },
		{ label: 'Quote', icon: QuoteIcon, run: () => insert('\n> ', '', 'quote') },
		{ label: 'List', icon: ListIcon, run: () => insert('\n- ', '', 'item') }
	];
</script>

<div class="overflow-hidden rounded-lg border border-line">
	<div
		role="toolbar"
		aria-label="Markdown formatting"
		class="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper-soft p-1"
	>
		{#each tools as tool (tool.label)}
			<Button variant="ghost" size="icon" aria-label={tool.label} onclick={tool.run}>
				<tool.icon aria-hidden="true" />
			</Button>
		{/each}
		<Button
			variant="ghost"
			size="sm"
			aria-expanded={imageOpen}
			aria-controls="{id}-image-panel"
			onclick={() => (imageOpen ? (imageOpen = false) : openImage())}
		>
			<ImageIcon aria-hidden="true" />Image
		</Button>
	</div>

	{#if imageOpen}
		<div id="{id}-image-panel" class="flex flex-col gap-3 border-b border-line bg-paper-soft p-4">
			<ImageField
				id="{id}-image"
				bind:path={imagePath}
				bind:alt={imageAlt}
				altError={imageError}
				onuploaded={({ url }) => {
					imageUrl = url;
					imageError = '';
				}}
			/>
			<div class="flex gap-2">
				<Button size="sm" disabled={!imagePath || !imageUrl} onclick={insertImage}
					>Insert image</Button
				>
				<Button variant="ghost" size="sm" onclick={() => (imageOpen = false)}>Cancel</Button>
			</div>
		</div>
	{/if}

	<div class="grid min-[900px]:grid-cols-2">
		<div class="flex flex-col min-[900px]:border-r min-[900px]:border-line">
			<label for={id} class="border-b border-line px-4 py-2 text-caption text-ink-subtle"
				>{label}</label
			>
			<textarea
				{id}
				bind:this={textarea}
				bind:value
				spellcheck="true"
				class="min-h-[420px] w-full flex-1 resize-y border-0 bg-paper p-4 font-mono text-[13px] leading-[22px] text-ink focus:ring-0"
			></textarea>
		</div>
		<div class="flex flex-col border-t border-line min-[900px]:border-t-0">
			<span class="border-b border-line px-4 py-2 text-caption text-ink-subtle">Preview</span>
			<div class="min-h-[420px] overflow-auto bg-paper p-4" aria-live="off">
				{#if previewFailed}
					<p class="text-small text-ink-muted">
						Preview is unavailable right now. Your text is safe.
					</p>
				{:else if value.trim() === ''}
					<p class="text-small text-ink-subtle">Nothing to preview yet.</p>
				{:else}
					<Prose {html} />
				{/if}
			</div>
		</div>
	</div>
</div>

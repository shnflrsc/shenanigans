<script lang="ts">
	import BoldIcon from '@lucide/svelte/icons/bold';
	import CodeIcon from '@lucide/svelte/icons/code';
	import HeadingIcon from '@lucide/svelte/icons/heading-2';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ItalicIcon from '@lucide/svelte/icons/italic';
	import LinkIcon from '@lucide/svelte/icons/link';
	import ListIcon from '@lucide/svelte/icons/list';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import QuoteIcon from '@lucide/svelte/icons/quote';
	import type { Component } from 'svelte';
	import { tick, untrack } from 'svelte';
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

	// One pane at a time: Edit or Preview, switched from the right of the toolbar.
	let mode = $state<'edit' | 'preview'>('edit');
	const modes = [
		{ id: 'edit', label: 'Edit' },
		{ id: 'preview', label: 'Preview' }
	] as const;

	let textarea = $state<HTMLTextAreaElement | null>(null);
	let html = $state('');
	let previewFailed = $state(false);
	// True until the first render for the current text has come back.
	let waiting = $state(true);

	// The preview is rendered by the same function as the public pages (SR-13). To keep switching to it quick, the
	// text is rendered in the background a moment after typing pauses, so the result is usually waiting by the time
	// you press Preview; if it is not, it is rendered right away.
	let renderedFor: string | null = null;
	$effect(() => {
		const markdown = value;
		const showing = mode === 'preview';
		if (renderedFor === markdown) {
			untrack(() => (waiting = false));
			return;
		}
		untrack(() => (waiting = true));
		if (markdown.trim() === '') {
			untrack(() => {
				html = '';
				renderedFor = markdown;
				waiting = false;
			});
			return;
		}
		const timer = setTimeout(
			async () => {
				try {
					const response = await fetch('/admin/preview', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ markdown })
					});
					if (!response.ok) throw new Error(String(response.status));
					const result = (await response.json()) as { html: string };
					untrack(() => {
						// Ignore an answer for text that has changed since.
						if (markdown !== value) return;
						html = result.html;
						previewFailed = false;
						renderedFor = markdown;
						waiting = false;
					});
				} catch {
					untrack(() => (previewFailed = true));
				}
			},
			showing ? 0 : 600
		);
		return () => clearTimeout(timer);
	});

	/**
	 * Replaces a range through the browser's own text insertion, so Ctrl+Z still undoes it, then selects
	 * `selStart` to `selEnd` (default: the end of the new text).
	 */
	function replace(start: number, end: number, text: string, selStart?: number, selEnd?: number) {
		const el = textarea;
		if (!el) return;
		el.focus();
		el.setSelectionRange(start, end);
		const inserted = document.execCommand('insertText', false, text);
		if (!inserted) value = value.slice(0, start) + text + value.slice(end);
		const from = selStart ?? start + text.length;
		const to = selEnd ?? from;
		el.setSelectionRange(from, to);
		// Without native insertion the text changes on the next update, which moves the cursor again.
		if (!inserted) void tick().then(() => el.setSelectionRange(from, to));
	}

	/** Wraps the selection (or inserts a placeholder) and keeps the cursor useful. */
	export function insert(before: string, after = '', placeholder = '') {
		const el = textarea;
		if (!el) return;
		const { selectionStart: start, selectionEnd: end } = el;
		const selected = value.slice(start, end) || placeholder;
		replace(
			start,
			end,
			before + selected + after,
			start + before.length,
			start + before.length + selected.length
		);
	}

	/** Bold, italic and inline code: wraps the selection, or takes the markers off again when they are already there. */
	function toggleWrap(marker: string, placeholder: string) {
		const el = textarea;
		if (!el) return;
		const { selectionStart: start, selectionEnd: end } = el;
		const selected = value.slice(start, end);
		const len = marker.length;
		if (value.slice(start - len, start) === marker && value.slice(end, end + len) === marker) {
			replace(start - len, end + len, selected, start - len, end - len);
		} else if (
			selected.length >= len * 2 &&
			selected.startsWith(marker) &&
			selected.endsWith(marker)
		) {
			const inner = selected.slice(len, selected.length - len);
			replace(start, end, inner, start, start + inner.length);
		} else {
			insert(marker, marker, placeholder);
		}
	}

	/** Link: wraps the selection as the link text and selects the address so it can be typed straight over. */
	function insertLink() {
		const el = textarea;
		if (!el) return;
		const { selectionStart: start, selectionEnd: end } = el;
		const text = value.slice(start, end) || 'link text';
		const address = 'https://';
		const from = start + text.length + 3;
		replace(start, end, `[${text}](${address})`, from, from + address.length);
	}

	/** Adds a prefix to every selected line, or takes it off when all of them already have it. */
	function toggleLines(prefix: (index: number) => string, has: RegExp) {
		const el = textarea;
		if (!el) return;
		const { selectionStart: start, selectionEnd: end } = el;
		const from = value.lastIndexOf('\n', start - 1) + 1;
		let to = value.indexOf('\n', end);
		if (to === -1) to = value.length;
		const lines = value.slice(from, to).split('\n');
		const all = lines.every((line) => has.test(line));
		const next = lines
			.map((line, index) => (all ? line.replace(has, '') : prefix(index) + line))
			.join('\n');
		replace(from, to, next, from + (lines.length === 1 ? next.length : 0), from + next.length);
	}

	const heading = () => toggleLines(() => '## ', /^#{1,6} /);
	const bullets = () => toggleLines(() => '- ', /^[-*+] /);
	const numbered = () => toggleLines((i) => `${i + 1}. `, /^\d+[.)] /);
	const quote = () => toggleLines(() => '> ', /^> ?/);

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
	const mod = isMac ? '⌘' : 'Ctrl+';

	const tools: { label: string; hint: string; icon: Component; run: () => void }[] = [
		{ label: 'Heading', hint: 'Heading', icon: HeadingIcon, run: heading },
		{ label: 'Bold', hint: `Bold (${mod}B)`, icon: BoldIcon, run: () => toggleWrap('**', 'bold') },
		{
			label: 'Italic',
			hint: `Italic (${mod}I)`,
			icon: ItalicIcon,
			run: () => toggleWrap('_', 'italic')
		},
		{ label: 'Link', hint: `Link (${mod}K)`, icon: LinkIcon, run: insertLink },
		{
			label: 'Code',
			hint: `Code block (inline code: ${mod}E)`,
			icon: CodeIcon,
			run: () => insert('\n```ts\n', '\n```\n', 'code')
		},
		{ label: 'Quote', hint: `Quote (${mod}⇧.)`, icon: QuoteIcon, run: quote },
		{ label: 'List', hint: `Bulleted list (${mod}⇧8)`, icon: ListIcon, run: bullets },
		{
			label: 'Numbered list',
			hint: `Numbered list (${mod}⇧7)`,
			icon: ListOrderedIcon,
			run: numbered
		}
	];

	// A list item or quote line: indentation, then the marker.
	const MARKER = /^(\s*)(>\s?|[-*+]\s+(?:\[[ xX]\]\s+)?|(\d+)([.)])\s+)/;

	/** Inside a fenced code block, list and quote keys behave like plain text. */
	function inFence(position: number) {
		return ((value.slice(0, position).match(/^```/gm) ?? []).length & 1) === 1;
	}

	/** Enter on a list or quote line starts the next item; Enter on an empty one ends the list. */
	function continueList(): boolean {
		const el = textarea;
		if (!el || el.selectionStart !== el.selectionEnd) return false;
		const pos = el.selectionStart;
		const start = value.lastIndexOf('\n', pos - 1) + 1;
		let lineEnd = value.indexOf('\n', pos);
		if (lineEnd === -1) lineEnd = value.length;
		const before = value.slice(start, pos);
		const match = MARKER.exec(before);
		if (!match || inFence(pos)) return false;
		if (before.length === match[0].length && value.slice(pos, lineEnd).trim() === '') {
			replace(start, lineEnd, '', start);
			return true;
		}
		const [marker, indent, kind, number, delimiter] = match;
		let next = indent;
		if (number !== undefined) next += `${Number(number) + 1}${delimiter} `;
		else if (kind.startsWith('>')) next += '> ';
		else next += `${kind[0]} ${/\[[ xX]\]/.test(marker) ? '[ ] ' : ''}`;
		replace(pos, pos, '\n' + next);
		return true;
	}

	// Tab nests a list item and Shift+Tab lifts it. Escape first lets Tab move on to the next control instead.
	let tabLeaves = false;

	function indentList(outdent: boolean): boolean {
		const el = textarea;
		if (!el || tabLeaves) return false;
		const pos = el.selectionStart;
		const start = value.lastIndexOf('\n', pos - 1) + 1;
		let lineEnd = value.indexOf('\n', pos);
		if (lineEnd === -1) lineEnd = value.length;
		const line = value.slice(start, lineEnd);
		const match = MARKER.exec(line);
		if (!match || match[2].startsWith('>') || inFence(pos)) return false;
		const width = match[3] !== undefined ? match[0].length - match[1].length : 2;
		if (!outdent) {
			replace(start, start, ' '.repeat(width), pos + width);
		} else {
			const remove = Math.min(width, match[1].length);
			if (remove > 0) replace(start, start + remove, '', Math.max(start, pos - remove));
		}
		return true;
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.isComposing) return;
		if (event.key === 'Escape') tabLeaves = true;
		else if (event.key !== 'Tab' && event.key !== 'Shift') tabLeaves = false;

		if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
			if (indentList(event.shiftKey)) event.preventDefault();
			return;
		}
		if (
			event.key === 'Enter' &&
			!event.shiftKey &&
			!event.ctrlKey &&
			!event.metaKey &&
			!event.altKey
		) {
			if (continueList()) event.preventDefault();
			return;
		}
		if (!(event.ctrlKey || event.metaKey) || event.altKey) return;

		const key = event.key.toLowerCase();
		let run: (() => void) | null = null;
		if (!event.shiftKey) {
			if (key === 'b') run = () => toggleWrap('**', 'bold');
			else if (key === 'i') run = () => toggleWrap('_', 'italic');
			else if (key === 'e') run = () => toggleWrap('`', 'code');
			else if (key === 'k') run = insertLink;
		} else if (event.code === 'Digit8') run = bullets;
		else if (event.code === 'Digit7') run = numbered;
		else if (event.code === 'Period') run = quote;
		if (!run) return;
		event.preventDefault();
		run();
	}

	/** Pasting a web address over selected text makes it a link. */
	function onpaste(event: ClipboardEvent) {
		const el = textarea;
		if (!el || el.selectionStart === el.selectionEnd) return;
		const pasted = event.clipboardData?.getData('text/plain').trim() ?? '';
		if (!/^https?:\/\/\S+$/.test(pasted)) return;
		const selected = value.slice(el.selectionStart, el.selectionEnd);
		if (selected.includes('\n')) return;
		event.preventDefault();
		replace(el.selectionStart, el.selectionEnd, `[${selected}](${pasted})`);
	}
</script>

<div class="overflow-hidden rounded-lg border border-line">
	<div
		role="toolbar"
		aria-label="Markdown formatting"
		class="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper-soft p-1"
	>
		{#each tools as tool (tool.label)}
			<Button
				variant="ghost"
				size="icon"
				aria-label={tool.label}
				title={tool.hint}
				disabled={mode !== 'edit'}
				onclick={tool.run}
			>
				<tool.icon aria-hidden="true" />
			</Button>
		{/each}
		<Button
			variant="ghost"
			size="sm"
			disabled={mode !== 'edit'}
			aria-expanded={imageOpen}
			aria-controls="{id}-image-panel"
			onclick={() => (imageOpen ? (imageOpen = false) : openImage())}
		>
			<ImageIcon aria-hidden="true" />Image
		</Button>

		<!-- Edit and Preview, one at a time. -->
		<div
			role="tablist"
			aria-label="Editor view"
			class="ml-auto inline-flex rounded-md bg-fill-muted p-0.5"
		>
			{#each modes as tab (tab.id)}
				<button
					type="button"
					role="tab"
					id="{id}-tab-{tab.id}"
					aria-selected={mode === tab.id}
					aria-controls="{id}-panel-{tab.id}"
					tabindex={mode === tab.id ? 0 : -1}
					class="h-7 rounded-[5px] px-3 text-ui text-ink-muted aria-selected:bg-paper aria-selected:font-semibold aria-selected:text-ink aria-selected:shadow-sm"
					onclick={() => {
						mode = tab.id;
						if (tab.id === 'preview') imageOpen = false;
					}}
					onkeydown={(event) => {
						if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
						event.preventDefault();
						mode = mode === 'edit' ? 'preview' : 'edit';
						document.getElementById(`${id}-tab-${mode}`)?.focus();
					}}
				>
					{tab.label}
				</button>
			{/each}
		</div>
	</div>

	{#if imageOpen && mode === 'edit'}
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

	<div
		role="tabpanel"
		id="{id}-panel-edit"
		aria-labelledby="{id}-tab-edit"
		hidden={mode !== 'edit'}
		class="flex flex-col"
	>
		<textarea
			{id}
			aria-label={label}
			bind:this={textarea}
			bind:value
			spellcheck="true"
			{onkeydown}
			{onpaste}
			class="min-h-[420px] w-full flex-1 resize-y border-0 bg-paper p-4 font-mono text-[13px] leading-[22px] text-ink focus:ring-0"
		></textarea>
	</div>
	<div
		role="tabpanel"
		id="{id}-panel-preview"
		aria-labelledby="{id}-tab-preview"
		hidden={mode !== 'preview'}
		class="min-h-[420px] overflow-auto bg-paper p-4"
	>
		{#if previewFailed}
			<p class="text-small text-ink-muted">Preview is unavailable right now. Your text is safe.</p>
		{:else if value.trim() === ''}
			<p class="text-small text-ink-subtle">Nothing to preview yet.</p>
		{:else if waiting && html === ''}
			<p class="text-small text-ink-subtle">Rendering preview…</p>
		{:else}
			<Prose {html} />
		{/if}
	</div>
</div>

<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';

	type Tag = { id: string; name: string; slug: string };

	type Props = {
		id: string;
		tags: Tag[];
		selected: string[];
		/** Creates a tag on the server and returns it; an existing name in any letter case is reused. */
		oncreate: (name: string) => Promise<Tag | null>;
	};

	let { id, tags = $bindable(), selected = $bindable(), oncreate }: Props = $props();

	let query = $state('');
	let open = $state(false);
	let active = $state(0);
	let busy = $state(false);

	const chosen = $derived(
		selected.map((tagId) => tags.find((t) => t.id === tagId)).filter(Boolean) as Tag[]
	);
	const needle = $derived(query.trim().toLowerCase());
	const matches = $derived(
		tags.filter((t) => !selected.includes(t.id) && t.name.toLowerCase().includes(needle))
	);
	const exact = $derived(tags.some((t) => t.name.toLowerCase() === needle));
	const canCreate = $derived(needle.length > 0 && !exact);
	// Options: matching tags, then the create row.
	const optionCount = $derived(matches.length + (canCreate ? 1 : 0));

	function add(tag: Tag) {
		if (!selected.includes(tag.id)) selected = [...selected, tag.id];
		query = '';
		active = 0;
	}

	async function create() {
		if (busy) return;
		busy = true;
		const tag = await oncreate(query.trim());
		busy = false;
		if (tag) {
			if (!tags.some((t) => t.id === tag.id)) tags = [...tags, tag];
			add(tag);
		}
	}

	async function choose(index: number) {
		if (index < matches.length) add(matches[index]);
		else if (canCreate) await create();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			open = true;
			active = Math.min(active + 1, Math.max(optionCount - 1, 0));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (optionCount > 0) void choose(active);
		} else if (event.key === 'Escape') {
			if (open) {
				event.stopPropagation();
				open = false;
			}
		} else if (event.key === 'Backspace' && query === '' && selected.length) {
			selected = selected.slice(0, -1);
		}
	}
</script>

<div class="flex flex-col gap-2">
	{#if chosen.length}
		<ul class="flex flex-wrap gap-1.5" aria-label="Selected tags">
			{#each chosen as tag (tag.id)}
				<li
					class="inline-flex h-6 items-center gap-1 rounded-sm bg-fill-muted pr-1 pl-2 text-[12px] font-medium text-ink-muted"
				>
					{tag.name}
					<button
						type="button"
						class="grid size-5 place-items-center rounded-sm hover:bg-fill-hover"
						aria-label={`Remove tag ${tag.name}`}
						onclick={() => (selected = selected.filter((s) => s !== tag.id))}
					>
						<XIcon class="size-3" aria-hidden="true" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="relative">
		<input
			{id}
			type="text"
			role="combobox"
			aria-expanded={open && optionCount > 0}
			aria-controls="{id}-list"
			aria-autocomplete="list"
			aria-activedescendant={open && optionCount > 0 ? `${id}-opt-${active}` : undefined}
			autocomplete="off"
			placeholder="Add or create a tag"
			class="h-9 w-full rounded-md border border-line-strong bg-paper px-3 text-ui"
			bind:value={query}
			oninput={() => {
				open = true;
				active = 0;
			}}
			onfocus={() => (open = true)}
			onblur={() => setTimeout(() => (open = false), 120)}
			{onkeydown}
		/>
		{#if open && optionCount > 0}
			<ul
				id="{id}-list"
				role="listbox"
				class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-paper-raised p-1 shadow-md"
			>
				{#each matches as tag, i (tag.id)}
					<li
						id="{id}-opt-{i}"
						role="option"
						aria-selected={i === active}
						class="flex h-8 cursor-pointer items-center rounded-md px-2 text-ui aria-selected:bg-fill-hover"
						onmousedown={(event) => {
							event.preventDefault();
							add(tag);
						}}
					>
						{tag.name}
					</li>
				{/each}
				{#if canCreate}
					<li
						id="{id}-opt-{matches.length}"
						role="option"
						aria-selected={active === matches.length}
						class="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-ui aria-selected:bg-fill-hover"
						onmousedown={(event) => {
							event.preventDefault();
							void create();
						}}
					>
						<PlusIcon class="size-4" aria-hidden="true" />Create tag “{query.trim()}”
					</li>
				{/if}
			</ul>
		{/if}
	</div>
</div>

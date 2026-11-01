<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	type Tag = { id: string; name: string; slug: string };

	type Props = {
		/** Id of the "new tag" input. */
		id: string;
		tags: Tag[];
		selected: string[];
		/** Creates a tag on the server and returns it; an existing name in any letter case is reused. */
		oncreate: (name: string) => Promise<Tag | null>;
	};

	let { id, tags = $bindable(), selected = $bindable(), oncreate }: Props = $props();

	let name = $state('');
	let busy = $state(false);

	const toggle = (tag: Tag) => {
		selected = selected.includes(tag.id)
			? selected.filter((tagId) => tagId !== tag.id)
			: [...selected, tag.id];
	};

	/** Adds the typed name: picks the existing tag if there is one (any letter case), otherwise creates it. */
	async function add() {
		const wanted = name.trim();
		if (!wanted || busy) return;
		const existing = tags.find((t) => t.name.toLowerCase() === wanted.toLowerCase());
		if (existing) {
			if (!selected.includes(existing.id)) selected = [...selected, existing.id];
			name = '';
			return;
		}
		busy = true;
		const tag = await oncreate(wanted);
		busy = false;
		if (!tag) return;
		if (!tags.some((t) => t.id === tag.id)) tags = [...tags, tag];
		if (!selected.includes(tag.id)) selected = [...selected, tag.id];
		name = '';
	}
</script>

<!-- Every tag is a toggle chip: click to add it to the post, click again to remove it. -->
<div class="flex flex-col gap-3">
	{#if tags.length}
		<ul class="flex flex-wrap gap-2" aria-label="Tags">
			{#each tags as tag (tag.id)}
				<li>
					<button
						type="button"
						aria-pressed={selected.includes(tag.id)}
						class={cn(
							'inline-flex h-[30px] items-center rounded-sm border px-3 text-[12px] leading-4 font-medium transition-colors duration-150',
							selected.includes(tag.id)
								? 'border-ink bg-ink text-on-ink'
								: 'border-line bg-paper text-ink-muted hover:bg-fill-hover'
						)}
						onclick={() => toggle(tag)}
					>
						{tag.name}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<form
		class="flex gap-2"
		onsubmit={(event) => {
			event.preventDefault();
			void add();
		}}
	>
		<input
			{id}
			type="text"
			autocomplete="off"
			placeholder="New tag"
			aria-label="New tag"
			class="h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-paper px-3 text-ui"
			bind:value={name}
		/>
		<Button type="submit" variant="secondary" disabled={busy || name.trim() === ''}>
			<PlusIcon aria-hidden="true" />Add
		</Button>
	</form>
</div>

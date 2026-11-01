<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { about, resumeUrl } from '#lib/content/about.js';
	import Frame from './frame.svelte';
	import Section from './section.svelte';
	import SectionTitle from './section-title.svelte';
	import Tag from './tag.svelte';
</script>

<Section divider>
	<div id="about" class="flex flex-col gap-12">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<SectionTitle>About me</SectionTitle>
			{#if resumeUrl}
				<Button variant="secondary" href={resumeUrl}>Download résumé</Button>
			{/if}
		</div>

		<!-- Two rows: the catchphrase and bio, then the quick-facts card. -->
		<div class="flex flex-col gap-12">
			<div class="flex flex-col gap-6">
				<p class="text-prose-h2">
					{about.catchphrase} <span class="text-ink-subtle">{about.catchphraseSoft}</span>
				</p>
				<!-- Full width: the three parts of the story sit side by side on wide screens. -->
				<div class="grid gap-x-12 gap-y-4 min-[900px]:grid-cols-3">
					{#each about.bio as paragraph (paragraph)}
						<p class="text-body text-ink-muted">{paragraph}</p>
					{/each}
				</div>
			</div>
			<Frame>
				<dl class="grid grid-cols-2 gap-x-6 gap-y-5 min-[720px]:grid-cols-3">
					{#each about.facts as fact (fact.label)}
						<div class="flex flex-col gap-1">
							<dt class="text-caption text-ink-subtle">{fact.label}</dt>
							<dd class="text-small text-ink">{fact.value}</dd>
						</div>
					{/each}
				</dl>
			</Frame>
		</div>

		<div class="grid items-start gap-12 min-[900px]:grid-cols-2">
			<div class="flex flex-col gap-4">
				<h3 class="text-card-title">Skills and tools</h3>
				<div class="flex flex-col border-t border-line">
					{#each about.skills as group (group.label)}
						<div class="flex flex-wrap gap-x-4 gap-y-2 border-b border-line py-4">
							<span class="basis-[140px] pt-1 text-caption text-ink-subtle">{group.label}</span>
							<ul class="flex flex-1 basis-[240px] flex-wrap gap-2">
								{#each group.items as item, i (i)}<li><Tag label={item} /></li>{/each}
							</ul>
						</div>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-4">
				<h3 class="text-card-title">Experience and highlights</h3>
				<ol class="flex flex-col border-t border-line">
					{#each about.highlights as item (item.title)}
						<li class="flex flex-wrap gap-x-4 gap-y-1 border-b border-line py-4">
							<span class="basis-24 pt-1 text-caption text-ink-subtle">{item.when}</span>
							<div class="flex flex-1 basis-[240px] flex-col gap-1">
								<span class="text-[15px] leading-[22px] font-semibold">{item.title}</span>
								<span class="text-small text-ink-muted">{item.detail}</span>
							</div>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</div>
</Section>

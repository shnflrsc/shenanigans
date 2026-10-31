<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import Eyebrow from '#lib/components/site/eyebrow.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	type Props = {
		counts: { posts: number; projects: number; tags: number };
		children: Snippet;
	};

	let { counts, children }: Props = $props();

	const sections = $derived([
		{ label: 'Posts', route: '/admin/(app)/posts', path: '/admin/posts', count: counts.posts },
		{
			label: 'Projects',
			route: '/admin/(app)/projects',
			path: '/admin/projects',
			count: counts.projects
		},
		{ label: 'Tags', route: '/admin/(app)/tags', path: '/admin/tags', count: counts.tags }
	] as const);

	const current = (path: string) => page.url.pathname.startsWith(path);
</script>

<div class="min-h-dvh bg-paper min-[720px]:grid min-[720px]:grid-cols-[232px_1fr]">
	<!-- Desktop sidebar -->
	<aside
		class="hidden flex-col justify-between border-r border-line bg-paper-soft p-4 min-[720px]:flex"
	>
		<div class="flex flex-col gap-6">
			<div class="flex items-center justify-between px-2 pt-2">
				<span class="text-[15px] font-semibold tracking-[-0.01em]">Shenanigans</span>
				<Eyebrow>Admin</Eyebrow>
			</div>
			<nav aria-label="Admin" class="flex flex-col gap-1">
				{#each sections as item (item.path)}
					<a
						href={resolve(item.route)}
						aria-current={current(item.path) ? 'page' : undefined}
						class="flex h-[34px] items-center justify-between rounded-md px-3 text-ui text-ink-subtle hover:bg-fill-hover aria-[current=page]:bg-fill-hover aria-[current=page]:text-ink"
					>
						{item.label}
						<span class="text-caption">{item.count}</span>
					</a>
				{/each}
			</nav>
		</div>
		<form method="POST" action={resolve('/admin/(app)/signout')}>
			<Button type="submit" variant="ghost" class="w-full justify-start text-ink-subtle">
				<LogOutIcon aria-hidden="true" />Sign out
			</Button>
		</form>
	</aside>

	<!-- Phone top bar and section switcher -->
	<div class="min-[720px]:hidden">
		<div class="flex h-14 items-center justify-between border-b border-line bg-paper px-4">
			<span class="flex items-center gap-2">
				<span class="text-[15px] font-semibold tracking-[-0.01em]">Shenanigans</span>
				<Eyebrow>Admin</Eyebrow>
			</span>
			<form method="POST" action={resolve('/admin/(app)/signout')}>
				<Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
					<LogOutIcon aria-hidden="true" />
				</Button>
			</form>
		</div>
		<nav aria-label="Admin sections" class="grid grid-cols-3 gap-1 bg-paper-soft p-1.5">
			{#each sections as item (item.path)}
				<a
					href={resolve(item.route)}
					aria-current={current(item.path) ? 'page' : undefined}
					class={cn(
						'flex h-9 items-center justify-center rounded-md text-ui text-ink-subtle',
						'aria-[current=page]:bg-paper-raised aria-[current=page]:text-ink aria-[current=page]:shadow-sm'
					)}>{item.label}</a
				>
			{/each}
		</nav>
	</div>

	<main class="min-w-0 px-4 py-6 min-[720px]:px-12 min-[720px]:py-8">
		<div class="mx-auto flex max-w-[1040px] flex-col gap-6">
			{@render children()}
		</div>
	</main>
</div>

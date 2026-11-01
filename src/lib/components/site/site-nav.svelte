<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import XIcon from '@lucide/svelte/icons/x';
	import ThemeToggle from '#lib/components/theme-toggle.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { mailto, nav, site } from '#lib/site.js';

	let open = $state(false);
	let menuButton = $state<HTMLButtonElement | null>(null);

	const isCurrent = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

	async function close(returnFocus = true) {
		if (!open) return;
		open = false;
		if (returnFocus) {
			await tick();
			menuButton?.focus();
		}
	}

	// A resized or navigated page should not keep the panel open.
	$effect(() => {
		void page.url.pathname;
		open = false;
	});
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && close()} />

<header class="relative z-30 border-b border-line bg-paper">
	<div class="mx-auto flex h-14 max-w-[1080px] items-center gap-6 px-6 min-[1024px]:px-16">
		<a
			href={resolve('/(site)')}
			class="rounded-md text-[15px] font-semibold tracking-[-0.01em] text-ink">{site.name}</a
		>

		<nav aria-label="Main" class="ml-4 flex items-center gap-1 max-[640px]:hidden">
			{#each nav as item (item.path)}
				<a
					href={resolve(item.route)}
					aria-current={isCurrent(item.path) ? 'page' : undefined}
					class="inline-flex h-8 items-center rounded-md px-3 text-ui text-ink-subtle transition-colors duration-150 hover:bg-fill-hover hover:text-ink aria-[current=page]:bg-fill-hover aria-[current=page]:text-ink"
					>{item.label}</a
				>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-2">
			<ThemeToggle />
			<Button variant="default" size="sm" href={mailto} class="max-[640px]:hidden"
				>Get in touch</Button
			>
			<Button
				bind:ref={menuButton}
				variant="secondary"
				size="icon"
				class="size-10 min-[641px]:hidden"
				aria-label={open ? 'Close menu' : 'Open menu'}
				aria-expanded={open}
				aria-controls="site-mobile-menu"
				onclick={() => (open ? close() : (open = true))}
			>
				{#if open}
					<XIcon aria-hidden="true" />
				{:else}
					<MenuIcon aria-hidden="true" />
				{/if}
			</Button>
		</div>
	</div>

	{#if open}
		<div
			id="site-mobile-menu"
			class="absolute inset-x-0 top-full border-b border-line bg-paper px-6 pt-2 pb-6 min-[641px]:hidden"
		>
			<nav aria-label="Mobile" class="flex flex-col">
				{#each nav as item (item.path)}
					<a
						href={resolve(item.route)}
						aria-current={isCurrent(item.path) ? 'page' : undefined}
						onclick={() => close(false)}
						class="flex min-h-12 items-center rounded-md px-3 text-prose-h3 text-ink-subtle hover:bg-fill-hover aria-[current=page]:bg-fill-hover aria-[current=page]:text-ink"
						>{item.label}</a
					>
				{/each}
			</nav>
			<div class="mt-2 border-t border-line pt-4">
				<Button variant="default" size="lg" href={mailto} class="w-full">Get in touch</Button>
			</div>
		</div>
	{/if}
</header>

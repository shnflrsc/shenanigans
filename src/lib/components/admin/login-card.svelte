<script lang="ts">
	import { enhance } from '$app/forms';
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import LoaderIcon from '@lucide/svelte/icons/loader-circle';
	import { Alert } from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import Eyebrow from '#lib/components/site/eyebrow.svelte';

	export type LoginState = 'default' | 'denied' | 'rate-limited' | 'error';

	let { status = 'default' }: { status?: LoginState } = $props();
	let submitting = $state(false);
	const rateLimited = $derived(status === 'rate-limited');
</script>

<main class="grid min-h-dvh place-items-center bg-paper-soft p-6" aria-labelledby="login-title">
	<div class="flex w-full max-w-[400px] flex-col gap-4 rounded-lg border border-line bg-paper p-8">
		<div class="flex items-center justify-between">
			<span class="text-[15px] font-semibold tracking-[-0.01em]">Shenanigans</span>
			<Eyebrow>Admin</Eyebrow>
		</div>
		<div>
			<h1 id="login-title" class="text-prose-h3">Sign in</h1>
			<p class="mt-1.5 text-small text-ink-muted">Only the owner of this site can sign in.</p>
		</div>

		{#if status === 'denied'}
			<Alert>
				<AlertCircleIcon aria-hidden="true" />
				<div>
					<b class="font-semibold">This GitHub account doesn’t have access.</b>
					<p class="text-small text-ink-muted">
						You’ve been signed out again. Use the account that owns this site.
					</p>
				</div>
			</Alert>
		{:else if status === 'rate-limited'}
			<Alert>
				<ClockIcon aria-hidden="true" />
				<div>
					<b class="font-semibold">Too many attempts.</b>
					<p class="text-small text-ink-muted">Sign-in is paused for now. Try again later.</p>
				</div>
			</Alert>
		{:else if status === 'error'}
			<Alert>
				<AlertCircleIcon aria-hidden="true" />
				<div>
					<b class="font-semibold">Sign-in didn’t finish.</b>
					<p class="text-small text-ink-muted">
						GitHub didn’t send back a valid response. Try again.
					</p>
				</div>
			</Alert>
		{/if}

		<form
			method="POST"
			action="/admin?/signin"
			use:enhance={() => {
				submitting = true;
				// A successful sign-in redirects to GitHub, so the busy state stays until the page unloads.
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<Button type="submit" size="lg" class="w-full" disabled={rateLimited || submitting}>
				{#if submitting}
					<LoaderIcon class="animate-spin" aria-hidden="true" />
					Signing in…
				{:else}
					Continue with GitHub
				{/if}
			</Button>
		</form>
	</div>
</main>

<script lang="ts">
	import BranchIcon from '@lucide/svelte/icons/git-branch';
	import BriefcaseIcon from '@lucide/svelte/icons/briefcase';
	import MailIcon from '@lucide/svelte/icons/mail';
	import { Button } from '#lib/components/ui/button/index.js';
	import { mailto, site } from '#lib/site.js';

	const year = new Date().getFullYear();
</script>

<footer class="border-t border-line bg-paper-soft">
	<div
		class="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 min-[1024px]:px-16"
	>
		<span class="text-caption text-ink-subtle">© {year} {site.owner} · {site.domain}</span>
		<ul class="flex items-center gap-1" aria-label="Contact and social links">
			<li>
				<Button variant="ghost" size="sm" href={mailto}
					><MailIcon aria-hidden="true" class="text-ink-subtle" />Email</Button
				>
			</li>
			<li>
				<Button variant="ghost" size="sm" href={site.github}
					><BranchIcon aria-hidden="true" class="text-ink-subtle" />GitHub</Button
				>
			</li>
			<li>
				<Button variant="ghost" size="sm" href={site.linkedin}
					><BriefcaseIcon aria-hidden="true" class="text-ink-subtle" />LinkedIn</Button
				>
			</li>
		</ul>
	</div>
</footer>

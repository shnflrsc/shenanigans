/**
 * Refreshes the public pages affected by an admin change (PR-6, D9).
 *
 * Preferred: on-demand revalidation on Vercel. When `VERCEL_ISR_BYPASS_TOKEN` is set, each affected URL is
 * requested with the `x-prerender-revalidate` header, which makes Vercel regenerate its cached copy.
 * Fallback: without the token nothing is called and the short shared cache (s-maxage=45 plus 10s stale-while-revalidate: at most 55s stale, PR-1/PR-6) is what
 * keeps pages within the 60 second window; the dashboard says so after every save.
 */
export type Changed = {
	/** Post slugs whose page or preview image changed. */
	posts?: string[];
	/** Project slugs whose page changed. */
	projects?: string[];
};

/** Pages that can change whenever any content changes: indexes, Home, the sitemap. */
const ALWAYS = ['/', '/projects', '/blog', '/sitemap.xml'];

export function affectedPaths(changed: Changed): string[] {
	return [
		...ALWAYS,
		...(changed.posts ?? []).flatMap((slug) => [`/blog/${slug}`, `/og/${slug}.png`]),
		...(changed.projects ?? []).map((slug) => `/projects/${slug}`)
	];
}

type Options = { token?: string; origin?: string; fetch?: typeof fetch };

export async function revalidatePublic(changed: Changed, options: Options = {}): Promise<void> {
	const token = options.token ?? process.env.VERCEL_ISR_BYPASS_TOKEN;
	const origin = options.origin ?? process.env.ORIGIN ?? process.env.PUBLIC_SITE_ORIGIN;
	if (!token || !origin) return;
	const send = options.fetch ?? fetch;
	await Promise.allSettled(
		affectedPaths(changed).map((path) =>
			send(origin + path, { method: 'HEAD', headers: { 'x-prerender-revalidate': token } })
		)
	);
}

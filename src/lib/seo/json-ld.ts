import { site } from '#lib/site.js';

type Json = Record<string, unknown>;

const person = {
	'@type': 'Person',
	name: site.fullName,
	url: site.origin,
	sameAs: [site.github, site.linkedin]
};

const url = (path: string) => `${site.origin}${path === '/' ? '' : path}` || site.origin;

/** Home: who the site is about and the site itself (M12-3). */
export const homeLd = (): Json[] => [
	{
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: site.name,
		url: site.origin,
		description: site.description,
		inLanguage: 'en'
	},
	{ '@context': 'https://schema.org', ...person, description: site.caption }
];

/** Home, then each step down to the page; the last step has no link target besides its own address. */
export const breadcrumbLd = (trail: { name: string; path: string }[]): Json => ({
	'@context': 'https://schema.org',
	'@type': 'BreadcrumbList',
	itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((step, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: step.name,
		item: url(step.path)
	}))
});

export const postLd = (post: {
	slug: string;
	title: string;
	excerpt: string;
	publishedAt: Date | string | null;
	updatedAt: Date | string;
	image: string;
}): Json[] => [
	{
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.excerpt,
		url: url(`/blog/${post.slug}`),
		mainEntityOfPage: url(`/blog/${post.slug}`),
		image: post.image,
		...(post.publishedAt ? { datePublished: new Date(post.publishedAt).toISOString() } : {}),
		dateModified: new Date(post.updatedAt).toISOString(),
		author: person,
		inLanguage: 'en'
	},
	breadcrumbLd([
		{ name: 'Blog', path: '/blog' },
		{ name: post.title, path: `/blog/${post.slug}` }
	])
];

export const projectLd = (project: {
	slug: string;
	title: string;
	summary: string;
	repoUrl: string | null;
	year: number | null;
	tags: { name: string }[];
	image: string | null;
}): Json[] => [
	{
		'@context': 'https://schema.org',
		'@type': project.repoUrl ? 'SoftwareSourceCode' : 'CreativeWork',
		name: project.title,
		description: project.summary,
		url: url(`/projects/${project.slug}`),
		author: person,
		...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
		...(project.year ? { dateCreated: String(project.year) } : {}),
		...(project.image ? { image: project.image } : {}),
		...(project.tags.length ? { keywords: project.tags.map((t) => t.name).join(', ') } : {})
	},
	breadcrumbLd([
		{ name: 'Projects', path: '/projects' },
		{ name: project.title, path: `/projects/${project.slug}` }
	])
];

/** JSON for a script block: `<` is escaped so no content can close the tag or open a comment. */
export const serializeLd = (data: Json | Json[]) =>
	JSON.stringify(data).replace(/</g, String.raw`\u003c`);

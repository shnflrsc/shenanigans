/**
 * Development fixtures. Everything here is sample content marked as such; real content is written
 * through the admin dashboard (PLAN.md H9). Safe to run repeatedly. Refuses to run in production.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import postgres from 'postgres';
import * as s from '../src/lib/server/db/schema';

if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s });

const days = (n: number) => new Date(Date.UTC(2026, 9, 28) - n * 86_400_000);

const alerts = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']
	.map((t) => `> [!${t}]\n> This is a ${t.toLowerCase()} callout.`)
	.join('\n\n');

const markdownFixture = `## Sample post

[SAMPLE CONTENT] This post exists to exercise the markdown pipeline.

${alerts}

\`\`\`ts
const greet = (name: string) => \`Hello, \${name}\`;
console.log(greet('world'));
\`\`\`

\`\`\`python
def greet(name):
    return f"Hello, {name}"
\`\`\`

\`\`\`bash
bun install && bun run dev
\`\`\`

| Column | Other |
| --- | --- |
| a | b |
`;

const hostile = `# Hostile content

<script>window.__pwned = true</script>

<img src=x onerror="window.__pwned = true">

[click me](javascript:window.__pwned=true)

![x](javascript:window.__pwned=true)

\`\`\`"><img src=x onerror=window.__pwned=true>
code
\`\`\`

<svg onload="window.__pwned = true"></svg>
`;

async function main() {
	const tagRows = await db
		.insert(s.tags)
		.values(
			['Svelte', 'TypeScript', 'Supabase', 'Design', 'Learning'].map((name) => ({
				name,
				slug: name.toLowerCase()
			}))
		)
		.onConflictDoNothing()
		.returning();
	const tags = new Map(
		(await db.select().from(s.tags))
			.map((t) => [t.slug, t.id] as const)
			.concat(tagRows.map((t) => [t.slug, t.id] as const))
	);

	await db
		.insert(s.projects)
		.values([
			{
				slug: 'sample-handbook-assistant',
				title: 'Sample: Handbook assistant',
				summary: '[SAMPLE] A study helper that answers questions about a student handbook.',
				body: markdownFixture,
				year: 2026,
				role: 'Solo',
				team: 'Solo',
				liveUrl: 'https://example.com',
				repoUrl: 'https://github.com/example/sample',
				featured: true,
				sortOrder: 0,
				status: 'published',
				firstPublishedAt: days(30)
			},
			{
				slug: 'sample-shenanigans',
				title: 'Sample: Shenanigans',
				summary: '[SAMPLE] This site: a portfolio and blog.',
				body: markdownFixture,
				year: 2026,
				role: 'Design and build',
				team: 'Solo',
				sortOrder: 1,
				status: 'published',
				firstPublishedAt: days(20)
			},
			{
				slug: 'sample-draft-project',
				title: 'Sample: Draft project',
				summary: '[SAMPLE] A project that is still a draft and must never be public.',
				sortOrder: 2,
				status: 'draft'
			}
		])
		.onConflictDoNothing();

	const [featured] = await db
		.select()
		.from(s.projects)
		.where(eq(s.projects.slug, 'sample-handbook-assistant'));

	await db
		.insert(s.posts)
		.values([
			{
				slug: 'sample-first-post',
				title: 'Sample: What I learned building a handbook assistant',
				excerpt: '[SAMPLE] One concrete takeaway about retrieval and student handbooks.',
				body: markdownFixture,
				status: 'published',
				publishedAt: days(3),
				projectId: featured.id
			},
			{
				slug: 'sample-second-post',
				title: 'Sample: Notes on Svelte 5 runes',
				excerpt: '[SAMPLE] How $state and $derived changed how I write components.',
				body: markdownFixture,
				status: 'published',
				publishedAt: days(10)
			},
			{
				slug: 'sample-hostile-post',
				title: 'Sample: Hostile markdown payloads',
				excerpt: '[SAMPLE] Script and event-handler payloads that must render inert.',
				body: hostile,
				status: 'published',
				publishedAt: days(20)
			},
			{
				slug: 'sample-draft-post',
				title: 'Sample: Draft post',
				excerpt: '[SAMPLE] A draft that must never be public.',
				body: 'Unpublished.'
			}
		])
		.onConflictDoNothing();

	const posts = await db
		.select()
		.from(s.posts)
		.where(inArray(s.posts.slug, ['sample-first-post', 'sample-second-post']));
	const links = posts.flatMap((p) =>
		['svelte', 'typescript'].map((t) => ({ postId: p.id, tagId: tags.get(t)! }))
	);
	await db.insert(s.postTags).values(links).onConflictDoNothing();
	const projects = await db.select().from(s.projects);
	await db
		.insert(s.projectTags)
		.values(projects.map((p) => ({ projectId: p.id, tagId: tags.get('svelte')! })))
		.onConflictDoNothing();

	console.log('Seeded sample projects, posts and tags.');
}

main().finally(() => client.end());

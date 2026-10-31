import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { rehypeGithubAlerts } from 'rehype-github-alerts';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { rehypeCodeBlocks } from './code-blocks';

/**
 * The one markdown pipeline (SR-13): public pages and the admin live preview both call renderMarkdown().
 *
 * Order matters for safety (SR-8):
 *  1. remark-rehype with raw HTML left off, so HTML in the source never becomes markup.
 *  2. rehype-sanitize before anything that adds markup.
 *  3. Alerts, highlighting and code headers run afterwards and emit only fixed markup.
 * Highlighting is class based (hljs-*), so no inline styles are produced (UR-6).
 */
const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: false })
	.use(rehypeSanitize, {
		...defaultSchema,
		// Headings and footnotes keep their ids but with the default "user-content-" prefix so they cannot clobber page globals.
		clobberPrefix: 'user-content-'
	})
	.use(rehypeGithubAlerts, {})
	.use(rehypeHighlight, { detect: false, ignoreMissing: true })
	.use(rehypeCodeBlocks)
	.use(rehypeStringify);

// Created once per server instance and reused (PR-5).
export function renderMarkdown(source: string): string {
	return String(processor.processSync(source));
}

/** Words per minute used for read time. */
const WORDS_PER_MINUTE = 200;

/** Read time in whole minutes (at least 1), computed from the markdown body (not stored). */
export function readTimeMinutes(source: string): number {
	const text = source.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~|\-[\]()!]/g, ' ');
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import tokensCss from '#lib/styles/tokens.css?raw';
import grotesk400 from '@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff?inline';
import grotesk600 from '@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff?inline';
import mono400 from '@fontsource/space-mono/files/space-mono-latin-400-normal.woff?inline';
import { site } from '#lib/site.js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The light theme values from the token file, so the image uses the design tokens and no colours of its own. */
const light = (() => {
	const block = tokensCss.slice(tokensCss.indexOf(':root'));
	const body = block.slice(block.indexOf('{') + 1, block.indexOf('}'));
	return Object.fromEntries(
		[...body.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]])
	);
})();

const bytes = (dataUri: string) => Buffer.from(dataUri.slice(dataUri.indexOf(',') + 1), 'base64');
const fonts = [
	{
		name: 'Space Grotesk',
		data: bytes(grotesk400),
		weight: 400 as const,
		style: 'normal' as const
	},
	{
		name: 'Space Grotesk',
		data: bytes(grotesk600),
		weight: 600 as const,
		style: 'normal' as const
	},
	{ name: 'Space Mono', data: bytes(mono400), weight: 400 as const, style: 'normal' as const }
];

type Node = {
	type: string;
	props: { style?: Record<string, unknown>; children?: Node | string | (Node | string)[] };
};
const el = (
	style: Record<string, unknown>,
	children?: Node | string | (Node | string)[],
	type = 'div'
): Node => ({ type, props: { style: { display: 'flex', ...style }, children } });

const caption = (text: string) =>
	el(
		{
			fontFamily: 'Space Mono',
			fontSize: 22,
			letterSpacing: 1,
			textTransform: 'uppercase',
			color: light['ink-subtle']
		},
		text
	);

/**
 * The grayscale 4:5 portrait made by `bun run og:portrait` (satori cannot decode WebP or apply filters),
 * as a data URI. Absent until a portrait has been added (PLAN.md H7).
 */
const portraitFiles = import.meta.glob('/src/lib/assets/portrait-og.png', {
	query: '?inline',
	import: 'default',
	eager: true
}) as Record<string, string>;
const portraitUri: string | null = Object.values(portraitFiles)[0] ?? null;

/** The photo slot: the grayscale portrait, or a muted tile until a portrait exists. */
const photo = (size: number): Node => {
	const height = Math.round(size * 1.25);
	const uri = portraitUri;
	const box = {
		width: size,
		height,
		borderRadius: 10,
		overflow: 'hidden',
		background: light['fill-muted'],
		border: `1px solid ${light['line']}`
	};
	return uri
		? el(box, {
				type: 'img',
				props: { src: uri, width: size, height, style: { width: size, height } }
			} as Node)
		: el(box);
};

/** Small round portrait for the post preview (face crop of the same grayscale photo). */
const avatar = (size: number): Node => {
	const box = {
		width: size,
		height: size,
		borderRadius: size,
		overflow: 'hidden',
		background: light['fill-muted'],
		border: `1px solid ${light['line']}`
	};
	return portraitUri
		? el(box, {
				type: 'img',
				props: {
					src: portraitUri,
					width: size,
					height: size,
					style: { width: size, height: size, objectFit: 'cover', objectPosition: '50% 25%' }
				}
			} as Node)
		: el(box);
};

function frame(children: Node[]): Node {
	return el(
		{
			boxSizing: 'border-box',
			width: OG_WIDTH,
			height: OG_HEIGHT,
			background: light['paper'],
			color: light['ink'],
			fontFamily: 'Space Grotesk',
			padding: 72,
			flexDirection: 'column',
			justifyContent: 'space-between'
		},
		children
	);
}

/** Site preview: hero headline, name, site address, photo (FR-32). */
function siteCard(): Node {
	return frame([
		el({ justifyContent: 'space-between', alignItems: 'center', width: '100%' }, [
			el({ flexDirection: 'column', gap: 32, maxWidth: 700 }, [
				el(
					{
						flexDirection: 'column',
						fontSize: 84,
						lineHeight: '92px',
						fontWeight: 600,
						letterSpacing: -3
					},
					[
						el({}, 'Hi, I build things.'),
						el({ color: light['ink-subtle'] }, 'Sometimes they even work.')
					]
				),
				el({ flexDirection: 'column', gap: 6 }, [
					el({ fontSize: 30, fontWeight: 600 }, site.fullName),
					caption(site.caption)
				])
			]),
			photo(240)
		]),
		caption(site.domain)
	]);
}

/** Post preview: "Blog", date, read time, title, name and site address. The title is drawn as text, never markup. */
function postCard(post: { title: string; date: string; readTime: string }): Node {
	const size = post.title.length > 90 ? 52 : post.title.length > 55 ? 64 : 76;
	return frame([
		el({ gap: 20, alignItems: 'center' }, [
			el(
				{ background: light['fill-muted'], borderRadius: 4, padding: '6px 14px' },
				caption('Blog')
			),
			caption(post.date),
			caption(post.readTime)
		]),
		el(
			{
				fontSize: size,
				lineHeight: `${size + 10}px`,
				fontWeight: 600,
				letterSpacing: -2,
				maxWidth: 1000
			},
			post.title
		),
		el({ justifyContent: 'space-between', alignItems: 'center', width: '100%' }, [
			el({ alignItems: 'center', gap: 20 }, [
				avatar(56),
				el({ fontSize: 26, fontWeight: 600 }, site.fullName)
			]),
			caption(site.domain)
		])
	]);
}

async function toPng(tree: Node): Promise<Uint8Array> {
	// satori accepts plain element objects as well as JSX.
	const svg = await satori(tree as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts });
	return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}

export const renderSiteImage = () => toPng(siteCard());
export const renderPostImage = (post: { title: string; date: string; readTime: string }) =>
	toPng(postCard(post));

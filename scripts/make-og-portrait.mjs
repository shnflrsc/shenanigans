/**
 * Makes src/lib/assets/portrait-og.png: the portrait cropped to 4:5 and turned grayscale, for the link-preview
 * images (satori and resvg cannot decode WebP or apply filters). Uses the Playwright Chromium that e2e tests install.
 * Run again whenever portrait.* changes: `bun run og:portrait`.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = 'src/lib/assets/';
const source = readdirSync(dir).find((f) => /^portrait\.(jpe?g|png|webp)$/.test(f));
if (!source) throw new Error('Add src/lib/assets/portrait.jpg, .png or .webp first');
const ext = source.split('.').pop();
const mime = ext === 'jpg' ? 'jpeg' : ext;
const uri = `data:image/${mime};base64,${readFileSync(dir + source).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const png = await page.evaluate(async (src) => {
	const img = new Image();
	img.src = src;
	await img.decode();
	const W = 600,
		H = 750;
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
	// "cover" crop, keeping the top of the picture (faces sit high), like object-position: center 30%.
	const scale = Math.max(W / img.width, H / img.height);
	const w = img.width * scale,
		h = img.height * scale;
	ctx.filter = 'grayscale(1)';
	ctx.drawImage(img, (W - w) / 2, -(h - H) * 0.3, w, h);
	return canvas.toDataURL('image/png').split(',')[1];
}, uri);
await browser.close();
writeFileSync(dir + 'portrait-og.png', Buffer.from(png, 'base64'));
console.log('wrote', dir + 'portrait-og.png');

const date = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	timeZone: 'UTC'
});

/** "Oct 28, 2026". The caption style shows it uppercase. */
export const formatDate = (value: Date | string) => date.format(new Date(value));

export const formatReadTime = (minutes: number) => `${minutes} min read`;

const bucket = 'images';

/** Public URL of an uploaded image. Only the storage path is stored, so a bucket or domain change never breaks content (3.2). */
export function imageUrl(origin: string, path: string) {
	return `${origin.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path}`;
}

/** Widths Vercel's image optimizer may resize to (vite.config.ts allows exactly these). */
export const IMAGE_WIDTHS = [320, 480, 640, 800, 1024, 1280];

/** A resized, recompressed copy of an uploaded image, served through Vercel's optimizer. */
export const optimizedUrl = (url: string, width: number) =>
	`/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;

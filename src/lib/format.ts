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

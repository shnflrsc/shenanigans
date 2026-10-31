/** Image uploads (SR-9, D3): a short allowlist of raster types, a size cap, and no SVG (it can carry script). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const TYPES = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/avif': 'avif'
} as const;
export type AllowedType = keyof typeof TYPES;

/** Works out the real type from the first bytes, so a renamed file or a lying Content-Type is caught. */
export function sniffType(bytes: Uint8Array): AllowedType | null {
	const at = (offset: number, text: string) =>
		[...text].every((c, i) => bytes[offset + i] === c.charCodeAt(0));
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
	if (bytes[0] === 0x89 && at(1, 'PNG')) return 'image/png';
	if (at(0, 'GIF87a') || at(0, 'GIF89a')) return 'image/gif';
	if (at(0, 'RIFF') && at(8, 'WEBP')) return 'image/webp';
	if (at(4, 'ftyp') && (at(8, 'avif') || at(8, 'avis'))) return 'image/avif';
	return null;
}

export type UploadCheck =
	{ ok: true; type: AllowedType; extension: string } | { ok: false; message: string };

export function checkUpload(file: { size: number; type: string }, head: Uint8Array): UploadCheck {
	if (file.size === 0) return { ok: false, message: 'That file is empty.' };
	if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: 'Images can be up to 5 MB.' };
	const type = sniffType(head);
	if (!type) return { ok: false, message: 'Use a JPEG, PNG, WebP, GIF or AVIF image.' };
	// The declared type must agree with the content.
	if (file.type && file.type !== type) {
		return { ok: false, message: 'The file type does not match its content.' };
	}
	return { ok: true, type, extension: TYPES[type] };
}

/** Random object name under the year, never derived from the uploaded file name. */
export function objectPath(extension: string, now = new Date(), id = crypto.randomUUID()) {
	return `${now.getUTCFullYear()}/${id}.${extension}`;
}

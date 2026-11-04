/** Search results show about 120 to 160 characters of a description (M12-8). */
export function lengthHint(text: string) {
	const length = text.trim().length;
	if (length === 0) return 'Aim for 120 to 160 characters.';
	if (length < 120) return `${length} characters. A little longer reads better in search results.`;
	if (length > 160) return `${length} characters. Search results cut it off after about 160.`;
	return `${length} characters.`;
}

/** Site-wide constants: contact, social links and address (PRODUCT.md 4.3, 7). */
export const site = {
	name: 'Shenanigans',
	owner: 'Darl',
	fullName: 'Darl Shanen Floresca',
	caption: 'BSIT student · Bulacan State University',
	domain: 'shenanigans.is-a.dev',
	origin: 'https://shenanigans.is-a.dev',
	email: 'floresca.shanegarcia@gmail.com',
	github: 'https://github.com/shnflrsc',
	linkedin: 'https://www.linkedin.com/in/darl-shanen-floresca/',
	description:
		'Darl’s portfolio and blog: projects, case studies and notes on what I learn along the way.'
} as const;

export const mailto = `mailto:${site.email}`;

/** Main navigation. `route` is the typed route id (route groups included) for resolve(); `path` is the URL. */
export const nav = [
	{ label: 'Home', route: '/(site)', path: '/' },
	{ label: 'Projects', route: '/(site)/projects', path: '/projects' },
	{ label: 'Blog', route: '/(site)/blog', path: '/blog' }
] as const;

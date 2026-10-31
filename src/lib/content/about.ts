/**
 * About me content (FR-23). Part of the site's code, not the database: changing it means a redeploy.
 * Everything in [brackets] is a placeholder until the real text arrives (PLAN.md H9).
 */
export const about = {
	catchphrase: 'Jack of all trades,',
	catchphraseSoft: 'incompetent at none.',
	bio: [
		'[How you got into programming, in one or two sentences.]',
		'[What you’re focusing on getting better at, and why.]',
		'[What you do away from the keyboard.]'
	],
	facts: [
		{ label: 'Studying', value: '[Program, year level]' },
		{ label: 'School', value: 'Bulacan State University' },
		{ label: 'Based in', value: '[City, Country]' },
		{ label: 'Graduating', value: '[Year]' },
		{ label: 'Open to', value: '[Internships, freelance, …]' },
		{ label: 'Languages', value: '[Languages you speak]' }
	],
	skills: [
		{ label: 'Languages', items: ['[Language]', '[Language]', '[Language]'] },
		{ label: 'Frontend', items: ['[Framework]', '[Library]', '[Tool]'] },
		{ label: 'Backend & data', items: ['[Service]', '[Database]', '[Library]'] },
		{ label: 'Tools', items: ['[Tool]', '[Tool]', '[Tool]'] },
		{ label: 'Learning now', items: ['[Topic]', '[Topic]'] }
	],
	highlights: [
		{
			when: '[Year]',
			title: '[Role, project]',
			detail: '[One line on what it was and why it matters.]'
		},
		{ when: '[Year]', title: '[Award or certification]', detail: '[Who gave it, and for what.]' },
		{ when: '[Year] – now', title: '[Degree]', detail: '[School, college]' }
	]
};

/** Set at build time from whether static/resume.pdf exists; the button is hidden otherwise (FR-23). */
export const resumeUrl = __HAS_RESUME__ ? '/resume.pdf' : null;

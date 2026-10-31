/**
 * About me content (FR-23). Part of the site's code, not the database: changing it means a redeploy.
 */
export const about = {
	catchphrase: 'Jack of all trades,',
	catchphraseSoft: 'incompetent at none.',
	bio: [
		'I started programming as a kid, trying to squeeze more FPS out of Minecraft on a low-end laptop. That led me to modding, and modding led me to Java.',
		'Besides sharpening my development skills, I’m working on the ones that go with them: communication, networking, sales and marketing.',
		'Away from the keyboard, I’m learning Spanish, doing calisthenics and practicing portrait drawing.'
	],
	facts: [
		{ label: 'Studying', value: 'BS Information Technology, 2nd year' },
		{ label: 'School', value: 'Bulacan State University' },
		{ label: 'Based in', value: 'Bulacan, Philippines' },
		{ label: 'Graduating', value: '2029' },
		{ label: 'Open to', value: 'Internships' },
		{ label: 'Languages', value: 'English, Filipino, Spanish' }
	],
	// Groups with no items are left out, so "Learning now" appears once there is something to list.
	skills: [
		{ label: 'Languages', items: ['Java', 'Python', 'JavaScript', 'SQL'] },
		{ label: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'HTML', 'CSS'] },
		{
			label: 'Backend & data',
			items: ['Spring Boot', 'PostgreSQL', 'MySQL', 'JPA/Hibernate', 'REST APIs', 'AWS S3']
		},
		{ label: 'Tools', items: ['Git', 'GitHub', 'Docker'] }
	],
	highlights: [
		{
			when: '2026',
			title: 'Lead Developer, Escapture',
			detail: 'LearnPossible2 AI Hackathon Challenge'
		},
		{ when: '2026', title: '1st Runner Up', detail: 'RAITE Quiz Bee Challenge' },
		{
			when: '2025 – now',
			title: 'BS Information Technology',
			detail: 'Bulacan State University'
		}
	]
};

/** Set at build time from whether static/resume.pdf exists; the button is hidden otherwise (FR-23). */
export const resumeUrl = __HAS_RESUME__ ? '/resume.pdf' : null;

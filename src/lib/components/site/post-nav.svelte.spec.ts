import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '../../../routes/layout.css';
import PostNav from './post-nav.svelte';

describe('PostNav', () => {
	it('keeps a long unbroken title inside its card', async () => {
		const title = 'GoogleMeetAutoAttendanceCheckerForEveryClassroomAndEveryLectureHallOnCampus';
		await page.viewport(1280, 800);
		document.body.style.width = '760px';
		await render(PostNav, {
			label: 'More projects',
			previous: { href: '/projects/a', title: 'BetterMeycauayan' },
			next: { href: '/projects/b', title }
		});
		const card = page.getByRole('link', { name: /Next/ }).element();
		const text = page.getByText(title).element();
		// Measure the text itself, which is wider than its box when it overflows.
		const range = document.createRange();
		range.selectNodeContents(text);
		expect(range.getBoundingClientRect().right).toBeLessThanOrEqual(
			card.getBoundingClientRect().right
		);
	});
});

import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

const LONG = 'E2E-GoogleMeetAutoAttendanceCheckerForEveryClassroomAndEveryLectureHallOnCampus';

test.beforeEach(async ({ context }) => {
	await resetRateLimits();
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from projects where slug like 'e2e-%'`);
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from projects where slug like 'e2e-%'`);
	await resetRateLimits();
});

test('a long unbroken title wraps instead of running off the screen on a phone', async ({
	page,
	browser
}) => {
	await page.goto('/admin/projects/new');
	await page.getByLabel('Title').fill(LONG);
	await page.getByLabel('Summary').fill('Long title project');
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
	await page.goto('/admin/posts/new');
	await page.getByLabel('Title').fill(LONG);
	await page.getByLabel('Excerpt').fill('Long title post');
	await page.locator('#body').fill('Body');
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

	const phone = await browser.newContext({ viewport: { width: 375, height: 812 } });
	const visitor = await phone.newPage();
	const slug = LONG.toLowerCase();
	for (const path of [`/projects/${slug}`, `/blog/${slug}`, '/projects', '/blog', '/']) {
		await expect
			.poll(async () => (await visitor.request.get(path)).status(), { timeout: 60_000 })
			.toBe(200);
		await visitor.goto(path);
		const fits = await visitor.evaluate(() => {
			const heading = [...document.querySelectorAll('h1, h2, h3')].find((h) =>
				h.textContent?.includes('GoogleMeet')
			);
			if (!heading) return { found: false, page: true, text: true };
			const range = document.createRange();
			range.selectNodeContents(heading);
			return {
				found: true,
				// No sideways scrolling, and the title's own text stays inside the screen.
				page: document.documentElement.scrollWidth <= window.innerWidth,
				text: range.getBoundingClientRect().right <= window.innerWidth
			};
		});
		if (path !== '/') expect(fits.found, path).toBe(true);
		expect(fits.page, `${path} scrolls sideways`).toBe(true);
		expect(fits.text, `${path} title is cut off`).toBe(true);
	}
});

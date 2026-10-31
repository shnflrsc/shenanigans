import { browser } from '$app/env';
import { withViewTransition } from '#lib/motion/view-transition.js';

export type ThemeChoice = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function systemTheme(): ThemeChoice {
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function stored(): ThemeChoice | null {
	try {
		const value = localStorage.getItem(STORAGE_KEY);
		return value === 'light' || value === 'dark' ? value : null;
	} catch {
		return null;
	}
}

/** The theme in effect. The inline script in app.html has already set data-theme before first paint. */
class Theme {
	current = $state<ThemeChoice>(
		browser
			? ((document.documentElement.dataset.theme as ThemeChoice | undefined) ??
					stored() ??
					systemTheme())
			: 'light'
	);

	constructor() {
		if (!browser) return;
		// Follow the system only while the visitor has not chosen a theme.
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (stored()) return;
			this.apply(systemTheme());
		});
	}

	private apply(next: ThemeChoice) {
		this.current = next;
		document.documentElement.dataset.theme = next;
	}

	toggle() {
		const next: ThemeChoice = this.current === 'dark' ? 'light' : 'dark';
		// The whole page cross-fades; browsers without view transitions switch instantly.
		void withViewTransition(() => this.apply(next), { theme: true });
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// Storage can be blocked; the choice then lasts for this visit only.
		}
	}
}

export const theme = new Theme();

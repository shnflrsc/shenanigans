/**
 * Refreshes the public pages affected by an admin change (PR-6). The mechanism is chosen in M7 (D9);
 * until then the 60 second shared cache window (PR-1) is the fallback and the dashboard says so.
 */
export type Changed = {
	/** Post slugs whose page or preview image changed. */
	posts?: string[];
	/** Project slugs whose page changed. */
	projects?: string[];
};

export async function revalidatePublic(changed: Changed): Promise<void> {
	void changed;
}

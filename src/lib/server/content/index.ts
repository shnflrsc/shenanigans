import { db } from '../db';
import * as pub from './public';

export type { Post, Project, TagCount, TagRef } from './public';

/** Public queries bound to the app database. */
export const content = {
	listPublishedProjects: (opts?: { tag?: string }) => pub.listPublishedProjects(db, opts),
	getFeaturedProject: () => pub.getFeaturedProject(db),
	getPublishedProject: (slug: string) => pub.getPublishedProject(db, slug),
	listPublishedPosts: (opts?: { tag?: string; limit?: number; offset?: number }) =>
		pub.listPublishedPosts(db, opts),
	getPublishedPost: (slug: string) => pub.getPublishedPost(db, slug),
	projectTagCounts: () => pub.projectTagCounts(db),
	postTagCounts: () => pub.postTagCounts(db),
	countPublished: () => pub.countPublished(db),
	listPublishedEntries: () => pub.listPublishedEntries(db)
};

import type { CommentThreadDoc } from "@jiscribe/doc/model/objects/base/CommentThreadDoc";

/** The threads of one object, split by resolution and ordered for display. */
export type SortedCommentThreads = {
	/** Threads still open, newest first. */
	open: CommentThreadDoc[];
	/** Threads already resolved, newest first; drawn under the collapsed section. */
	resolved: CommentThreadDoc[];
};

/**
 * Splits an object's threads into the two groups the panel draws, each ordered
 * by the root comment's `createdAt`, newest first. A root whose timestamp does
 * not parse sorts last rather than scrambling the rest.
 *
 * @param threads - Threads as `readCommentThreads` returned them, in document order; the array is not modified
 */
export const sortCommentThreads = (
	threads: readonly CommentThreadDoc[],
): SortedCommentThreads => {
	const rootTimeOf = (thread: CommentThreadDoc): number => {
		const time = new Date(thread.comments[0].createdAt).getTime();
		return Number.isNaN(time) ? -Infinity : time;
	};
	const newestFirst = (a: CommentThreadDoc, b: CommentThreadDoc): number =>
		rootTimeOf(b) - rootTimeOf(a);

	return {
		open: threads
			.filter((thread) => thread.resolved !== true)
			.sort(newestFirst),
		resolved: threads
			.filter((thread) => thread.resolved === true)
			.sort(newestFirst),
	};
};

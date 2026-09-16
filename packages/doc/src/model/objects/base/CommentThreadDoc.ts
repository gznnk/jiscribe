import { isBoolean, isObject, isString } from "@jiscribe/basic-validators";

/**
 * One comment in a thread. `comments[0]` of a thread is the comment that opened
 * it; every later entry is a reply.
 */
export type CommentDoc = {
	/** Unique within the document. */
	id: string;
	/**
	 * Display name of the writer, as the host handed it to the canvas
	 * (`commentAuthor`). Compared as a plain string to decide whose comment can
	 * be edited or deleted, so two people sharing a name are one writer.
	 */
	author: string;
	/** Plain text. Newlines are kept; nothing is drawn from it on the canvas. */
	body: string;
	/** ISO 8601 timestamp of the post. */
	createdAt: string;
	/** ISO 8601 timestamp of the last edit; absent while the body is as posted. */
	editedAt?: string;
};

/**
 * One thread of comments on an object. An object holds any number of threads
 * under `meta.comments`; a thread is either open or resolved as a whole.
 */
export type CommentThreadDoc = {
	/** Unique within the document. */
	id: string;
	/** Absent or false while the thread is open. */
	resolved?: boolean;
	/** Display name of whoever resolved it; absent while open. */
	resolvedBy?: string;
	/** Never empty: a thread whose last comment is deleted is dropped with it. */
	comments: CommentDoc[];
};

/**
 * Type guard for a well-formed comment.
 *
 * @param value - Value to narrow; `editedAt` may be absent, but every other field must be a string
 */
export const isCommentDoc = (value: unknown): value is CommentDoc => {
	if (!isObject(value)) {
		return false;
	}
	return (
		isString(value.id) &&
		isString(value.author) &&
		isString(value.body) &&
		isString(value.createdAt) &&
		(value.editedAt === undefined || isString(value.editedAt))
	);
};

/**
 * Type guard for a well-formed thread: an id, optional resolution fields, and at
 * least one well-formed comment.
 *
 * @param value - Value to narrow; a thread with an empty `comments` array is rejected
 */
export const isCommentThreadDoc = (
	value: unknown,
): value is CommentThreadDoc => {
	if (!isObject(value)) {
		return false;
	}
	return (
		isString(value.id) &&
		(value.resolved === undefined || isBoolean(value.resolved)) &&
		(value.resolvedBy === undefined || isString(value.resolvedBy)) &&
		Array.isArray(value.comments) &&
		value.comments.length > 0 &&
		value.comments.every(isCommentDoc)
	);
};

/**
 * Reads the threads of an object's `meta.comments`, dropping anything that is not
 * a well-formed thread. `meta` is free-form and never validated on load (a
 * hand-edited file can put anything there), so this is the one place a reader
 * narrows it; the writer side re-serializes what it read, so a malformed entry
 * is dropped on the first write that touches the object.
 *
 * @param meta - The object's `meta`, or undefined for an object without one
 * @returns The well-formed threads in document order; empty when there are none
 */
export const readCommentThreads = (
	meta: Record<string, unknown> | undefined,
): CommentThreadDoc[] => {
	const comments = meta?.comments;
	if (!Array.isArray(comments)) {
		return [];
	}
	return comments.filter(isCommentThreadDoc);
};

/**
 * Counts the threads still open — what the marker on the object and the badge on
 * the menu button show.
 *
 * @param threads - Threads as `readCommentThreads` returns them
 */
export const countOpenCommentThreads = (
	threads: readonly CommentThreadDoc[],
): number => threads.filter((thread) => thread.resolved !== true).length;

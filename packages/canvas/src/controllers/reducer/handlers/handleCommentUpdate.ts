import {
	readCommentThreads,
	type CommentThreadDoc,
} from "@jiscribe/doc/model/objects/base/CommentThreadDoc";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { withMetaEntry } from "../../../states/objects/base/withMetaEntry";
import type { CanvasControllerState } from "../../CanvasTypes";
import { copyObjectsRecord } from "../../utils/cowObjects";
import type { CommentOp } from "../CanvasActions";

/** The threads with the one under `threadId` swapped for `updatedThread`. */
const replaceThread = (
	threads: readonly CommentThreadDoc[],
	threadId: string,
	updatedThread: CommentThreadDoc,
): CommentThreadDoc[] =>
	threads.map((thread) => (thread.id === threadId ? updatedThread : thread));

/**
 * Applies one comment op to an object's threads, building fresh objects rather
 * than writing into the ones handed in — doc and state share a thread by
 * reference (see MetaMapper), so an in-place edit would reach the document
 * behind the reducer's back.
 *
 * @param threads - The object's threads as `readCommentThreads` returns them, in document order
 * @param op - The op to apply; its `objectId` is the caller's business and is not read here
 * @returns The threads after the op, in document order with a new thread appended last, or null when the op changes nothing: an unknown thread or comment, a thread already in the state asked for, an edit to the body already posted, or a thread id already taken
 */
export const applyCommentOp = (
	threads: readonly CommentThreadDoc[],
	op: CommentOp,
): CommentThreadDoc[] | null => {
	const srcThread = threads.find((thread) => thread.id === op.threadId);

	switch (op.kind) {
		case "addThread": {
			if (srcThread) {
				return null;
			}
			return [...threads, { id: op.threadId, comments: [op.comment] }];
		}
		case "addReply": {
			if (!srcThread) {
				return null;
			}
			return replaceThread(threads, op.threadId, {
				...srcThread,
				comments: [...srcThread.comments, op.comment],
			});
		}
		case "editComment": {
			const srcComment = srcThread?.comments.find(
				(comment) => comment.id === op.commentId,
			);
			if (!srcThread || !srcComment || srcComment.body === op.body) {
				return null;
			}
			return replaceThread(threads, op.threadId, {
				...srcThread,
				comments: srcThread.comments.map((comment) =>
					comment.id === op.commentId
						? { ...comment, body: op.body, editedAt: op.editedAt }
						: comment,
				),
			});
		}
		case "deleteComment": {
			if (
				!srcThread ||
				!srcThread.comments.some((comment) => comment.id === op.commentId)
			) {
				return null;
			}
			const remainingComments = srcThread.comments.filter(
				(comment) => comment.id !== op.commentId,
			);
			// A thread is its comments: the last deletion takes the thread with it,
			// since a thread with none is not a well-formed thread to begin with.
			if (remainingComments.length === 0) {
				return threads.filter((thread) => thread.id !== op.threadId);
			}
			return replaceThread(threads, op.threadId, {
				...srcThread,
				comments: remainingComments,
			});
		}
		case "resolveThread": {
			if (!srcThread || srcThread.resolved === true) {
				return null;
			}
			return replaceThread(threads, op.threadId, {
				...srcThread,
				resolved: true,
				resolvedBy: op.resolvedBy,
			});
		}
		case "reopenThread": {
			if (!srcThread || srcThread.resolved !== true) {
				return null;
			}
			// Both fields go, rather than `resolved: false` left behind: an open
			// thread says nothing about resolution, the shape a thread is born with.
			const {
				resolved: _resolved,
				resolvedBy: _resolvedBy,
				...reopenedThread
			} = srcThread;
			return replaceThread(threads, op.threadId, reopenedThread);
		}
	}
};

/**
 * Applies one comment op to the named object's `meta.comments`, the threads it
 * carries in the document.
 *
 * Nothing is drawn from `meta`, so the object's shape is untouched and no
 * descendant follows: a thread left on a group belongs to the group itself.
 *
 * @param state - The state to edit; only the object the op names is read and written
 * @param op - The op to apply; its ids and timestamps are minted by the caller, so this stays pure
 * @returns `state` itself when the op names an object the state does not hold, and when the op changes nothing (see {@link applyCommentOp})
 */
export const handleCommentUpdate = (
	state: CanvasControllerState,
	op: CommentOp,
): CanvasControllerState => {
	const srcObject = state.objects[op.objectId];
	if (!srcObject) {
		return state;
	}

	const updatedThreads = applyCommentOp(readCommentThreads(srcObject.meta), op);
	if (updatedThreads === null) {
		return state;
	}

	const updatedObject: ObjectState = {
		...srcObject,
		meta: withMetaEntry(
			srcObject.meta,
			"comments",
			updatedThreads.length === 0 ? undefined : updatedThreads,
		),
	};
	// A plain Record rather than a write into the map handed in: persistent state
	// must not accumulate copy-on-write views (cowObjects), and this route builds
	// none of its own to flatten afterwards.
	const updatedObjects = copyObjectsRecord(state.objects);
	updatedObjects[op.objectId] = updatedObject;
	return { ...state, objects: updatedObjects };
};

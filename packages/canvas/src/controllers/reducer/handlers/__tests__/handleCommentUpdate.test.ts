import type {
	CommentDoc,
	CommentThreadDoc,
} from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import { describe, expect, it } from "vitest";

import type { MetaState } from "../../../../states/objects/base/MetaState";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { rebrand } from "../../../../states/objects/utils/rebrand";
import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CommentOp } from "../../CanvasActions";
import { applyCommentOp, handleCommentUpdate } from "../handleCommentUpdate";

const comment = (id: string, body = "Looks off to me"): CommentDoc => ({
	id,
	author: "Ada",
	body,
	createdAt: "2026-09-16T09:00:00.000Z",
});

const thread = (
	id: string,
	comments: CommentDoc[] = [comment(`${id}-c1`)],
): CommentThreadDoc => ({ id, comments });

const resolvedThread = (id: string): CommentThreadDoc => ({
	...thread(id),
	resolved: true,
	resolvedBy: "Grace",
});

/** A state holding one rect, with the meta it is given. */
const stateWithMeta = (meta: MetaState | undefined): CanvasControllerState => {
	const rect = { id: "rect-1", type: "rect", meta } as unknown as ObjectState;
	return deepFreezeState({
		objects: { "rect-1": rect },
	} as unknown as CanvasControllerState);
};

const metaOf = (meta: Record<string, unknown>): MetaState =>
	rebrand<MetaState>(meta);

const threadsOf = (state: CanvasControllerState): unknown =>
	state.objects["rect-1"].meta?.comments;

describe("applyCommentOp", () => {
	it("appends a new thread after the ones already there", () => {
		const updated = applyCommentOp([thread("t1")], {
			kind: "addThread",
			objectId: "rect-1",
			threadId: "t2",
			comment: comment("t2-c1"),
		});

		expect(updated?.map((entry) => entry.id)).toEqual(["t1", "t2"]);
		expect(updated?.[1].comments).toEqual([comment("t2-c1")]);
	});

	it("changes nothing when the thread id is already taken", () => {
		expect(
			applyCommentOp([thread("t1")], {
				kind: "addThread",
				objectId: "rect-1",
				threadId: "t1",
				comment: comment("t1-c2"),
			}),
		).toBeNull();
	});

	it("appends a reply after the comment that opened the thread", () => {
		const updated = applyCommentOp([thread("t1"), thread("t2")], {
			kind: "addReply",
			objectId: "rect-1",
			threadId: "t1",
			comment: comment("t1-c2", "Fixed now"),
		});

		expect(updated?.[0].comments.map((entry) => entry.id)).toEqual([
			"t1-c1",
			"t1-c2",
		]);
		expect(updated?.[1]).toEqual(thread("t2"));
	});

	it("changes nothing when a reply names an unknown thread", () => {
		expect(
			applyCommentOp([thread("t1")], {
				kind: "addReply",
				objectId: "rect-1",
				threadId: "gone",
				comment: comment("c9"),
			}),
		).toBeNull();
	});

	it("states the new body and when it was edited", () => {
		const updated = applyCommentOp([thread("t1")], {
			kind: "editComment",
			objectId: "rect-1",
			threadId: "t1",
			commentId: "t1-c1",
			body: "Reads fine after all",
			editedAt: "2026-09-16T10:00:00.000Z",
		});

		expect(updated?.[0].comments[0]).toEqual({
			...comment("t1-c1", "Reads fine after all"),
			editedAt: "2026-09-16T10:00:00.000Z",
		});
	});

	it("changes nothing when the edit is to the body already posted", () => {
		expect(
			applyCommentOp([thread("t1")], {
				kind: "editComment",
				objectId: "rect-1",
				threadId: "t1",
				commentId: "t1-c1",
				body: comment("t1-c1").body,
				editedAt: "2026-09-16T10:00:00.000Z",
			}),
		).toBeNull();
	});

	it("changes nothing when the edit names an unknown comment", () => {
		expect(
			applyCommentOp([thread("t1")], {
				kind: "editComment",
				objectId: "rect-1",
				threadId: "t1",
				commentId: "gone",
				body: "Reads fine after all",
				editedAt: "2026-09-16T10:00:00.000Z",
			}),
		).toBeNull();
	});

	it("deletes one comment and leaves the rest of the thread standing", () => {
		const updated = applyCommentOp(
			[thread("t1", [comment("t1-c1"), comment("t1-c2")])],
			{
				kind: "deleteComment",
				objectId: "rect-1",
				threadId: "t1",
				commentId: "t1-c1",
			},
		);

		expect(updated?.[0].comments.map((entry) => entry.id)).toEqual(["t1-c2"]);
	});

	it("drops the thread with its last comment", () => {
		const updated = applyCommentOp([thread("t1"), thread("t2")], {
			kind: "deleteComment",
			objectId: "rect-1",
			threadId: "t1",
			commentId: "t1-c1",
		});

		expect(updated?.map((entry) => entry.id)).toEqual(["t2"]);
	});

	it("changes nothing when the deletion names an unknown comment", () => {
		expect(
			applyCommentOp([thread("t1")], {
				kind: "deleteComment",
				objectId: "rect-1",
				threadId: "t1",
				commentId: "gone",
			}),
		).toBeNull();
	});

	it("resolves a thread, naming who did it", () => {
		const updated = applyCommentOp([thread("t1")], {
			kind: "resolveThread",
			objectId: "rect-1",
			threadId: "t1",
			resolvedBy: "Grace",
		});

		expect(updated?.[0].resolved).toBe(true);
		expect(updated?.[0].resolvedBy).toBe("Grace");
	});

	it("changes nothing when the thread is resolved already", () => {
		expect(
			applyCommentOp([resolvedThread("t1")], {
				kind: "resolveThread",
				objectId: "rect-1",
				threadId: "t1",
				resolvedBy: "Alan",
			}),
		).toBeNull();
	});

	it("reopens a thread back to the shape it was born with", () => {
		const updated = applyCommentOp([resolvedThread("t1")], {
			kind: "reopenThread",
			objectId: "rect-1",
			threadId: "t1",
		});

		expect(updated?.[0]).toEqual(thread("t1"));
		expect("resolved" in updated![0]).toBe(false);
		expect("resolvedBy" in updated![0]).toBe(false);
	});

	it("changes nothing when the thread is open already", () => {
		expect(
			applyCommentOp([thread("t1")], {
				kind: "reopenThread",
				objectId: "rect-1",
				threadId: "t1",
			}),
		).toBeNull();
	});

	it("leaves the threads handed in untouched", () => {
		const srcThread = thread("t1");
		const srcThreads = Object.freeze([Object.freeze(srcThread)]);

		applyCommentOp(srcThreads, {
			kind: "addReply",
			objectId: "rect-1",
			threadId: "t1",
			comment: comment("t1-c2"),
		});

		expect(srcThread.comments).toHaveLength(1);
	});
});

describe("handleCommentUpdate", () => {
	const addThread: CommentOp = {
		kind: "addThread",
		objectId: "rect-1",
		threadId: "t1",
		comment: comment("t1-c1"),
	};

	it("writes the first thread into an object with no meta at all", () => {
		const state = handleCommentUpdate(stateWithMeta(undefined), addThread);

		expect(state.objects["rect-1"].meta).toEqual({
			comments: [thread("t1")],
		});
	});

	it("keeps the other meta fields beside the threads", () => {
		const state = handleCommentUpdate(
			stateWithMeta(metaOf({ name: "Server" })),
			addThread,
		);

		expect(state.objects["rect-1"].meta).toEqual({
			name: "Server",
			comments: [thread("t1")],
		});
	});

	it("drops the comments key once the last thread is gone", () => {
		const state = handleCommentUpdate(
			stateWithMeta(metaOf({ name: "Server", comments: [thread("t1")] })),
			{
				kind: "deleteComment",
				objectId: "rect-1",
				threadId: "t1",
				commentId: "t1-c1",
			},
		);

		expect(state.objects["rect-1"].meta).toEqual({ name: "Server" });
	});

	it("drops meta itself once the threads were all it held", () => {
		const state = handleCommentUpdate(
			stateWithMeta(metaOf({ comments: [thread("t1")] })),
			{
				kind: "deleteComment",
				objectId: "rect-1",
				threadId: "t1",
				commentId: "t1-c1",
			},
		);

		expect(state.objects["rect-1"].meta).toBeUndefined();
	});

	it("drops the malformed entries a hand-edited file left behind", () => {
		const state = handleCommentUpdate(
			stateWithMeta(
				metaOf({ comments: [thread("t1"), { id: "broken", comments: [] }] }),
			),
			{
				kind: "addReply",
				objectId: "rect-1",
				threadId: "t1",
				comment: comment("t1-c2"),
			},
		);

		expect(threadsOf(state)).toEqual([
			thread("t1", [comment("t1-c1"), comment("t1-c2")]),
		]);
	});

	it("leaves the state alone when the op names an object it does not hold", () => {
		const before = stateWithMeta(undefined);

		expect(
			handleCommentUpdate(before, { ...addThread, objectId: "gone" }),
		).toBe(before);
	});

	it("leaves the state alone when the op changes nothing", () => {
		const before = stateWithMeta(metaOf({ comments: [thread("t1")] }));

		expect(handleCommentUpdate(before, addThread)).toBe(before);
	});

	it("writes a fresh meta rather than into the one doc and state share", () => {
		const srcMeta = metaOf({ name: "Server", comments: [thread("t1")] });
		const before = stateWithMeta(srcMeta);

		const state = handleCommentUpdate(before, {
			kind: "resolveThread",
			objectId: "rect-1",
			threadId: "t1",
			resolvedBy: "Grace",
		});

		expect(state.objects["rect-1"].meta).not.toBe(srcMeta);
		expect(srcMeta.comments).toEqual([thread("t1")]);
		expect(before.objects["rect-1"].meta).toBe(srcMeta);
	});
});

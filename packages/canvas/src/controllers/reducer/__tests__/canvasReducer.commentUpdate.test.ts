import type {
	CommentDoc,
	CommentThreadDoc,
} from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { twoRectsDoc } from "./support/fixtures";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { CommentOp } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

const canvasReducer = createCanvasReducer(createTestRegistries());

const update = (
	state: CanvasControllerState,
	op: CommentOp,
): CanvasControllerState =>
	canvasReducer(state, { type: "COMMENT_UPDATE", op });

const comment = (id: string, body = "Looks off to me"): CommentDoc => ({
	id,
	author: "Ada",
	body,
	createdAt: "2026-09-16T09:00:00.000Z",
});

const openThread: CommentOp = {
	kind: "addThread",
	objectId: "rect-1",
	threadId: "t1",
	comment: comment("t1-c1"),
};

const threadsOf = (state: CanvasControllerState): CommentThreadDoc[] =>
	(state.objects["rect-1"].meta?.comments ?? []) as CommentThreadDoc[];

describe("canvasReducer / COMMENT_UPDATE", () => {
	it("opens a thread on the object the op names, selected or not", () => {
		const state = update(createTestState(twoRectsDoc), openThread);

		expect(threadsOf(state)).toEqual([
			{ id: "t1", comments: [comment("t1-c1")] },
		]);
		expect(state.objects["rect-2"].meta).toBeUndefined();
	});

	it("records one history entry per op and asks the host to save", () => {
		const before = createTestState(twoRectsDoc);

		const state = update(before, openThread);

		expect(state.history.past).toHaveLength(1);
		expect(state.commitVersion).toBe(before.commitVersion + 1);
		expect(state.saveRequest.version).toBe(before.saveRequest.version + 1);
	});

	it("records consecutive ops as entries of their own: nothing coalesces", () => {
		let state = update(createTestState(twoRectsDoc), openThread);
		state = update(state, {
			kind: "addReply",
			objectId: "rect-1",
			threadId: "t1",
			comment: comment("t1-c2", "Fixed now"),
		});

		expect(state.history.past).toHaveLength(2);
	});

	it("returns the state itself when the op changes nothing", () => {
		const before = update(createTestState(twoRectsDoc), openThread);

		expect(update(before, openThread)).toBe(before);
		expect(
			update(before, {
				kind: "reopenThread",
				objectId: "rect-1",
				threadId: "t1",
			}),
		).toBe(before);
	});

	it("returns the state itself when the op names an unknown object", () => {
		const before = createTestState(twoRectsDoc);

		expect(update(before, { ...openThread, objectId: "gone" })).toBe(before);
	});

	it("undoes a reply back to the thread as it stood", () => {
		let state = update(createTestState(twoRectsDoc), openThread);
		state = update(state, {
			kind: "addReply",
			objectId: "rect-1",
			threadId: "t1",
			comment: comment("t1-c2", "Fixed now"),
		});

		state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

		expect(threadsOf(state)).toEqual([
			{ id: "t1", comments: [comment("t1-c1")] },
		]);
	});

	it("undoes the first thread back to no comments at all", () => {
		let state = update(createTestState(twoRectsDoc), openThread);

		state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

		expect(state.objects["rect-1"].meta).toBeUndefined();
	});

	it("undoes a resolve back to the open thread", () => {
		let state = update(createTestState(twoRectsDoc), openThread);
		state = update(state, {
			kind: "resolveThread",
			objectId: "rect-1",
			threadId: "t1",
			resolvedBy: "Grace",
		});
		expect(threadsOf(state)[0].resolved).toBe(true);

		state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

		expect(threadsOf(state)[0].resolved).toBeUndefined();
	});
});

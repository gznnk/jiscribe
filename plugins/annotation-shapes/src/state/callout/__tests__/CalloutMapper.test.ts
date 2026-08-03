import { describe, it, expect } from "vitest";

import type { CalloutDoc } from "../../../schema/callout/CalloutDoc";
import { calloutToDoc, calloutToState } from "../CalloutMapper";
import type { CalloutState } from "../CalloutState";

/**
 * Callout is the only builtin that passes `extraKeys` to createFrameMapper, so
 * the tail's survival through the allow-list pass-through is specific to it:
 * a tail dropped here would silently reset every callout to the default tail.
 */
const doc = {
	id: "callout-1",
	type: "callout",
	x: 10,
	y: 20,
	width: 160,
	height: 110,
	tail: { side: "right", position: 0.8 },
} as unknown as CalloutDoc;

describe("CalloutMapper", () => {
	it("converts the top-left rect into a centered frame", () => {
		const state = calloutToState(doc) as unknown as Record<string, unknown>;
		expect(state).toMatchObject({ cx: 90, cy: 75, width: 160, height: 110 });
	});

	it("preserves the tail across a doc → state → doc round-trip", () => {
		const state = calloutToState(doc);
		expect(state.tail).toEqual({ side: "right", position: 0.8 });

		const roundTripped = calloutToDoc(state);
		expect(roundTripped.tail).toEqual({ side: "right", position: 0.8 });
		expect(roundTripped).toMatchObject({ x: 10, y: 20 });
	});

	it("does not invent a tail when the doc omits it (the default applies at render time)", () => {
		const { tail: _tail, ...withoutTail } = doc as unknown as Record<
			string,
			unknown
		>;
		const state = calloutToState(
			withoutTail as unknown as CalloutDoc,
		) as unknown as Record<string, unknown>;
		expect("tail" in state).toBe(false);
		expect(
			"tail" in (calloutToDoc(state as unknown as CalloutState) as object),
		).toBe(false);
	});

	it("does not leak the runtime-only parentId into the doc", () => {
		const state = {
			...calloutToState(doc),
			parentId: "group-9",
		} as unknown as CalloutState;
		expect("parentId" in (calloutToDoc(state) as object)).toBe(false);
	});
});

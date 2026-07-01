import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { commitTextEditIfNeeded } from "../commitTextEditIfNeeded";

type MinState = Pick<
	CanvasControllerState,
	"textEditState" | "objects" | "commitVersion"
>;

const makeState = (overrides: Partial<MinState> = {}): CanvasControllerState =>
	({
		textEditState: null,
		objects: {},
		commitVersion: 0,
		...overrides,
	}) as unknown as CanvasControllerState;

// object with a text property (passes isTextStyleState)
const textObj = (id: string, text: string) =>
	({ id, type: "rect", text }) as unknown;

describe("commitTextEditIfNeeded", () => {
	it("textEditState is null -> returns the same reference", () => {
		const state = makeState({ textEditState: null });
		expect(commitTextEditIfNeeded(state)).toBe(state);
	});

	it("textEditState present -> target object does not exist -> clears textEditState and returns", () => {
		const state = makeState({
			textEditState: { objectId: "missing", text: "hello" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(0); // the commit version does not change
	});

	it("textEditState present -> target object's text is a number (fails isTextStyleState) -> clears textEditState", () => {
		// isTextStyleState returns false unless text is a string
		const invalidTextObj = { id: "r1", type: "rect", text: 123 };
		const state = makeState({
			objects: {
				r1: invalidTextObj as unknown as CanvasControllerState["objects"][string],
			},
			textEditState: { objectId: "r1", text: "hello" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(0);
	});

	it("text unchanged -> clears textEditState but does not bump commitVersion", () => {
		const obj = textObj("r1", "same text");
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", text: "same text" },
			commitVersion: 5,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(5);
	});

	it("text changed -> updates the text and increments commitVersion", () => {
		const obj = textObj("r1", "old text");
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", text: "new text" },
			commitVersion: 3,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(4);
		const updatedObj = result.objects["r1"] as unknown as { text: string };
		expect(updatedObj.text).toBe("new text");
	});

	it("does not mutate the original objects when updating text (immutable)", () => {
		const obj = textObj("r1", "original");
		const originalObjects = {
			r1: obj as CanvasControllerState["objects"][string],
		};
		const state = makeState({
			objects: originalObjects,
			textEditState: { objectId: "r1", text: "updated" },
		});
		commitTextEditIfNeeded(state);
		const originalObj = originalObjects["r1"] as unknown as { text: string };
		expect(originalObj.text).toBe("original");
	});

	// ─── connector label (label.text) ───
	const connectorObj = (id: string, label?: { text: string }) =>
		({ id, type: "connector", ...(label ? { label } : {}) }) as unknown;

	it("connector: entering text from no label -> creates label.text and commits", () => {
		const c = connectorObj("c1");
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", text: "Yes" },
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(2);
		const updated = result.objects["c1"] as unknown as {
			label?: { text: string };
		};
		expect(updated.label?.text).toBe("Yes");
	});

	it("connector: committing a bare label (text only) with an empty string -> removes the label", () => {
		const c = connectorObj("c1", { text: "Yes" });
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", text: "" },
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.commitVersion).toBe(2);
		const updated = result.objects["c1"] as unknown as {
			label?: { text: string };
		};
		expect(updated.label).toBeUndefined();
	});

	it("connector: committing a styled label with an empty string -> keeps the label and only empties text", () => {
		// a label carrying more than text (style/placement) is not discarded even when emptied.
		const styledLabel = {
			text: "Yes",
			fill: "#dc2626",
			fontWeight: "bold",
			position: 0.3,
		};
		const c = {
			id: "c1",
			type: "connector",
			label: styledLabel,
		} as unknown;
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", text: "" },
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.commitVersion).toBe(2);
		const updated = result.objects["c1"] as unknown as {
			label?: {
				text: string;
				fill?: string;
				fontWeight?: string;
				position?: number;
			};
		};
		expect(updated.label).toBeDefined();
		expect(updated.label?.text).toBe("");
		// style/placement is preserved (recoverable on re-entry).
		expect(updated.label?.fill).toBe("#dc2626");
		expect(updated.label?.fontWeight).toBe("bold");
		expect(updated.label?.position).toBe(0.3);
	});

	it("connector: after emptying a styled label, re-entering text -> the style is restored", () => {
		const styledLabel = { text: "", fill: "#dc2626", fontWeight: "bold" };
		const c = {
			id: "c1",
			type: "connector",
			label: styledLabel,
		} as unknown;
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", text: "No" },
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		const updated = result.objects["c1"] as unknown as {
			label?: { text: string; fill?: string; fontWeight?: string };
		};
		expect(updated.label?.text).toBe("No");
		expect(updated.label?.fill).toBe("#dc2626");
		expect(updated.label?.fontWeight).toBe("bold");
	});

	it("connector: does not mutate the original objects when updating the label (immutable)", () => {
		const styledLabel = { text: "Yes", fill: "#dc2626" };
		const c = { id: "c1", type: "connector", label: styledLabel } as unknown;
		const originalObjects = {
			c1: c as CanvasControllerState["objects"][string],
		};
		const state = makeState({
			objects: originalObjects,
			textEditState: { objectId: "c1", text: "No" },
		});
		commitTextEditIfNeeded(state);
		const originalConnector = originalObjects["c1"] as unknown as {
			label: { text: string };
		};
		expect(originalConnector.label.text).toBe("Yes");
	});

	it("connector: label unchanged -> commitVersion does not increase", () => {
		const c = connectorObj("c1", { text: "Yes" });
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", text: "Yes" },
			commitVersion: 7,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(7);
	});
});

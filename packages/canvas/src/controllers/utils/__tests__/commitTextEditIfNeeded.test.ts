import { describe, it, expect } from "vitest";

import type { TextSlots } from "../../../states/objects/types/TextSlots";
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

// object with keyed text slots (passes isTextStyleState)
const textObj = (id: string, text: TextSlots) =>
	({ id, type: "rect", text }) as unknown;

const slotsOf = (state: CanvasControllerState, id: string): TextSlots =>
	(state.objects[id] as unknown as { text: TextSlots }).text;

describe("commitTextEditIfNeeded", () => {
	it("textEditState is null -> returns the same reference", () => {
		const state = makeState({ textEditState: null });
		expect(commitTextEditIfNeeded(state)).toBe(state);
	});

	it("textEditState present -> target object does not exist -> clears textEditState and returns", () => {
		const state = makeState({
			textEditState: { objectId: "missing", slotId: "body", text: "hello" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(0); // the commit version does not change
	});

	it("textEditState present -> target object's text is a number (fails isTextStyleState) -> clears textEditState", () => {
		// isTextStyleState returns false unless text is the keyed normal form
		const invalidTextObj = { id: "r1", type: "rect", text: 123 };
		const state = makeState({
			objects: {
				r1: invalidTextObj as unknown as CanvasControllerState["objects"][string],
			},
			textEditState: { objectId: "r1", slotId: "body", text: "hello" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(0);
	});

	it("text unchanged -> clears textEditState but does not bump commitVersion", () => {
		const obj = textObj("r1", { body: { text: "same text" } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "body", text: "same text" },
			commitVersion: 5,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(5);
	});

	it("text changed -> updates the text and increments commitVersion", () => {
		const obj = textObj("r1", { body: { text: "old text" } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "body", text: "new text" },
			commitVersion: 3,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(4);
		expect(slotsOf(result, "r1")).toEqual({ body: { text: "new text" } });
	});

	it("keeps the edited slot's styling, only its content changing", () => {
		const obj = textObj("r1", {
			body: { text: "old text", fontSize: 20, fontWeight: "bold" },
		});
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "body", text: "new text" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(slotsOf(result, "r1")).toEqual({
			body: { text: "new text", fontSize: 20, fontWeight: "bold" },
		});
	});

	it("does not mutate the original objects when updating text (immutable)", () => {
		const obj = textObj("r1", { body: { text: "original" } });
		const originalObjects = {
			r1: obj as CanvasControllerState["objects"][string],
		};
		const state = makeState({
			objects: originalObjects,
			textEditState: { objectId: "r1", slotId: "body", text: "updated" },
		});
		commitTextEditIfNeeded(state);
		const originalObj = originalObjects["r1"] as unknown as { text: TextSlots };
		expect(originalObj.text).toEqual({ body: { text: "original" } });
	});

	// ─── multi-slot write-back ───

	it("writes back only the edited slot, keeping the others and the key order", () => {
		const obj = textObj("r1", {
			name: { text: "User" },
			rows: { text: ["id", "name"] },
		});
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "name", text: "Account" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(slotsOf(result, "r1")).toEqual({
			name: { text: "Account" },
			rows: { text: ["id", "name"] },
		});
		expect(Object.keys(slotsOf(result, "r1"))).toEqual(["name", "rows"]);
	});

	it("splits the edited text on newlines for a slot holding rows", () => {
		const obj = textObj("r1", {
			name: { text: "User" },
			rows: { text: ["id"] },
		});
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "rows", text: "id\nname" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(slotsOf(result, "r1").rows.text).toEqual(["id", "name"]);
	});

	it("compares a row slot against its joined form, so an unchanged edit does not commit", () => {
		const obj = textObj("r1", { rows: { text: ["id", "name"] } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "rows", text: "id\nname" },
			commitVersion: 7,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(7);
	});

	// ─── connector label (label.text) ───
	const connectorObj = (id: string, label?: { text: string }) =>
		({ id, type: "connector", ...(label ? { label } : {}) }) as unknown;

	it("connector: entering text from no label -> creates label.text and commits", () => {
		const c = connectorObj("c1");
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", slotId: "label", text: "Yes" },
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
			textEditState: { objectId: "c1", slotId: "label", text: "" },
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
			textEditState: { objectId: "c1", slotId: "label", text: "" },
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
			textEditState: { objectId: "c1", slotId: "label", text: "No" },
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
			textEditState: { objectId: "c1", slotId: "label", text: "No" },
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
			textEditState: { objectId: "c1", slotId: "label", text: "Yes" },
			commitVersion: 7,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(7);
	});

	// ─── slot routing ───

	it("an unknown slotId -> clears textEditState without writing back", () => {
		const obj = textObj("r1", { body: { text: "original" } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "unknown", text: "edited" },
			commitVersion: 2,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(2);
		expect(slotsOf(result, "r1")).toEqual({ body: { text: "original" } });
	});

	it('slotId "label" on a shape without such a slot -> clears like any unknown slot', () => {
		const obj = textObj("r1", { body: { text: "original" } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "label", text: "edited" },
			commitVersion: 2,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(2);
		expect(slotsOf(result, "r1")).toEqual({ body: { text: "original" } });
	});

	it('a shape slot named "label" is not reserved -> commits into that slot', () => {
		const obj = textObj("r1", { label: { text: "original", fontSize: 12 } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", slotId: "label", text: "edited" },
			commitVersion: 2,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(3);
		expect(slotsOf(result, "r1")).toEqual({
			label: { text: "edited", fontSize: 12 },
		});
	});

	it("connector: a slotId other than the label pseudo slot -> clears without writing back", () => {
		const conn = connectorObj("c1", { text: "Yes" });
		const state = makeState({
			objects: { c1: conn as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", slotId: "body", text: "edited" },
			commitVersion: 2,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(2);
		expect(
			(result.objects["c1"] as unknown as { label: { text: string } }).label,
		).toEqual({ text: "Yes" });
	});
});

import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { describe, it, expect } from "vitest";

import type { ConnectorLabelPlacement } from "../../../connectors/label/calcConnectorLabelPlacement";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import { commitTextEditIfNeeded } from "../commitTextEditIfNeeded";

type MinState = Pick<
	CanvasControllerState,
	"textEditState" | "selection" | "objects" | "commitVersion"
>;

const makeState = (overrides: Partial<MinState> = {}): CanvasControllerState =>
	({
		textEditState: null,
		selection: { objectIds: [], part: null },
		objects: {},
		commitVersion: 0,
		...overrides,
	}) as unknown as CanvasControllerState;

/** A shape slot edit as its two halves: the draft, and the selection that owns it. */
const shapeEdit = (
	objectId: string,
	slotId: string,
	text: RichText,
): Pick<MinState, "textEditState" | "selection"> => ({
	textEditState: { kind: "shape", text },
	selection: { objectIds: [objectId], part: textSlotPartSelection(slotId) },
});

/** A connector label edit; the label is no part, so nothing is picked below the object. */
const labelEdit = (
	connectorId: string,
	text: string,
	placement?: ConnectorLabelPlacement,
): Pick<MinState, "textEditState" | "selection"> => ({
	textEditState: {
		kind: "connectorLabel",
		text,
		...(placement && { placement }),
	},
	selection: { objectIds: [connectorId], part: null },
});

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

	it("throws when the selected object the session belongs to is gone", () => {
		const state = makeState({
			...shapeEdit("missing", "body", "hello"),
		});
		expect(() => commitTextEditIfNeeded(state)).toThrow(/missing/);
	});

	it("throws when the selected object's text is no slot map (fails isTextStyleState)", () => {
		// isTextStyleState returns false unless text is the keyed normal form
		const invalidTextObj = { id: "r1", type: "rect", text: 123 };
		const state = makeState({
			objects: {
				r1: invalidTextObj as unknown as CanvasControllerState["objects"][string],
			},
			...shapeEdit("r1", "body", "hello"),
		});
		expect(() => commitTextEditIfNeeded(state)).toThrow(/no text slots/);
	});

	it("text unchanged -> clears textEditState but does not bump commitVersion", () => {
		const obj = textObj("r1", { body: { text: "same text" } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			...shapeEdit("r1", "body", "same text"),
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
			...shapeEdit("r1", "body", "new text"),
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
			...shapeEdit("r1", "body", "new text"),
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
			...shapeEdit("r1", "body", "updated"),
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
			...shapeEdit("r1", "name", "Account"),
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
			...shapeEdit("r1", "rows", "id\nname"),
		});
		const result = commitTextEditIfNeeded(state);
		expect(slotsOf(result, "r1").rows.text).toEqual(["id", "name"]);
	});

	it("compares a row slot against its joined form, so an unchanged edit does not commit", () => {
		const obj = textObj("r1", { rows: { text: ["id", "name"] } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			...shapeEdit("r1", "rows", "id\nname"),
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
			...labelEdit("c1", "Yes"),
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
			...labelEdit("c1", ""),
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.commitVersion).toBe(2);
		const updated = result.objects["c1"] as unknown as {
			label?: { text: string };
		};
		expect(updated.label).toBeUndefined();
	});

	it("connector: committing a styled label with an empty string -> keeps the style but drops the placement", () => {
		// the style of a label is not discarded when emptied; its placement is,
		// since it describes a label that no longer exists.
		const styledLabel = {
			text: "Yes",
			fill: "#dc2626",
			fontWeight: "bold",
			position: 0.3,
			offset: 20,
		};
		const c = {
			id: "c1",
			type: "connector",
			label: styledLabel,
		} as unknown;
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			...labelEdit("c1", ""),
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.commitVersion).toBe(2);
		const updated = result.objects["c1"] as unknown as {
			label?: ConnectorLabel;
		};
		expect(updated.label).toEqual({
			text: "",
			fill: "#dc2626",
			fontWeight: "bold",
		});
	});

	it("connector: committing a dragged but unstyled label with an empty string -> removes the label", () => {
		// nothing but the placement remains after emptying, and that is dropped too.
		const c = {
			id: "c1",
			type: "connector",
			label: { text: "Yes", position: 0.3, offset: 20 },
		} as unknown;
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			...labelEdit("c1", ""),
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.commitVersion).toBe(2);
		const updated = result.objects["c1"] as unknown as {
			label?: ConnectorLabel;
		};
		expect(updated.label).toBeUndefined();
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
			...labelEdit("c1", "No"),
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
			...labelEdit("c1", "No"),
		});
		commitTextEditIfNeeded(state);
		const originalConnector = originalObjects["c1"] as unknown as {
			label: { text: string };
		};
		expect(originalConnector.label.text).toBe("Yes");
	});

	// ─── connector label placement (the pending placement of a label being created) ───
	it("connector: a new label takes the pending placement from textEditState", () => {
		const c = connectorObj("c1");
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			...labelEdit("c1", "Yes", { position: 0.25, offset: 12 }),
		});
		const result = commitTextEditIfNeeded(state);
		const updated = result.objects["c1"] as unknown as {
			label?: ConnectorLabel;
		};
		expect(updated.label).toEqual({ text: "Yes", position: 0.25, offset: 12 });
	});

	it("connector: a pending placement on the midpoint is pruned to no keys", () => {
		const c = connectorObj("c1");
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			...labelEdit("c1", "Yes", { position: 0.5, offset: 0 }),
		});
		const result = commitTextEditIfNeeded(state);
		const updated = result.objects["c1"] as unknown as {
			label?: ConnectorLabel;
		};
		expect(updated.label).toEqual({ text: "Yes" });
	});

	it("connector: an empty text commits no label even with a pending placement", () => {
		const c = connectorObj("c1");
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			...labelEdit("c1", "", { position: 0.25, offset: 12 }),
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		const updated = result.objects["c1"] as unknown as {
			label?: ConnectorLabel;
		};
		expect(updated.label).toBeUndefined();
		// Nothing changed, so the session only closes.
		expect(result.commitVersion).toBe(1);
	});

	it("connector: a pending placement overrides the placement left on an emptied label", () => {
		// an externally authored document can hold a placement alongside empty text.
		const c = {
			id: "c1",
			type: "connector",
			label: { text: "", position: 0.2, offset: 30, fill: "#dc2626" },
		} as unknown;
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			...labelEdit("c1", "Back", { position: 0.75, offset: 0 }),
		});
		const result = commitTextEditIfNeeded(state);
		const updated = result.objects["c1"] as unknown as {
			label?: ConnectorLabel;
		};
		expect(updated.label).toEqual({
			text: "Back",
			position: 0.75,
			fill: "#dc2626",
		});
	});

	it("connector: an existing label keeps its own placement (no pending one)", () => {
		const c = {
			id: "c1",
			type: "connector",
			label: { text: "Yes", position: 0.3, offset: 20 },
		} as unknown;
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			...labelEdit("c1", "No"),
		});
		const result = commitTextEditIfNeeded(state);
		const updated = result.objects["c1"] as unknown as {
			label?: ConnectorLabel;
		};
		expect(updated.label).toEqual({ text: "No", position: 0.3, offset: 20 });
	});

	it("connector: label unchanged -> commitVersion does not increase", () => {
		const c = connectorObj("c1", { text: "Yes" });
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			...labelEdit("c1", "Yes"),
			commitVersion: 7,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(7);
	});

	// ─── slot routing ───

	it("throws on a slot the shape does not hold", () => {
		const obj = textObj("r1", { body: { text: "original" } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			...shapeEdit("r1", "unknown", "edited"),
			commitVersion: 2,
		});
		expect(() => commitTextEditIfNeeded(state)).toThrow(/unknown/);
	});

	it('throws on slotId "label" too, which is no reserved name', () => {
		const obj = textObj("r1", { body: { text: "original" } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			...shapeEdit("r1", "label", "edited"),
			commitVersion: 2,
		});
		expect(() => commitTextEditIfNeeded(state)).toThrow(/label/);
	});

	it('a shape slot named "label" is not reserved -> commits into that slot', () => {
		const obj = textObj("r1", { label: { text: "original", fontSize: 12 } });
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			...shapeEdit("r1", "label", "edited"),
			commitVersion: 2,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(3);
		expect(slotsOf(result, "r1")).toEqual({
			label: { text: "edited", fontSize: 12 },
		});
	});

	it("throws on a shape slot edit whose selected object holds no text", () => {
		const conn = connectorObj("c1", { text: "Yes" });
		const state = makeState({
			objects: { c1: conn as CanvasControllerState["objects"][string] },
			...shapeEdit("c1", "body", "edited"),
			commitVersion: 2,
		});
		expect(() => commitTextEditIfNeeded(state)).toThrow(/no text slots/);
	});
});

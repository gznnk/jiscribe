import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import { createTextSlotPartRegistry } from "../../../../../selection/__tests__/support/textSlotPartRegistry";
import { textSlotPartSelection } from "../../../../../selection/__tests__/support/textSlotPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../../selection/partKinds/textSlotPartKind";
import { isMetaSectionShown } from "../isMetaSectionShown";

/** A shape whose text lives in named slots, which is what a slot selection needs. */
const slottedShape = (id: string): ObjectState =>
	({
		id,
		type: "card",
		features: { text: "slots" },
		text: { body: { text: "hello" } },
	}) as unknown as ObjectState;

/** The slot kind on "card", plus a vertex kind declaring no style kinds. */
const objectPartKind = createTextSlotPartRegistry("card");
objectPartKind.register("line", [{ kind: "vertex", has: () => true }]);

const makeState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selection: selectionOf([]),
		textEditState: null,
		objects: {},
		...overrides,
	}) as unknown as CanvasControllerState;

describe("isMetaSectionShown", () => {
	it("shows the section for a single selected object", () => {
		expect(
			isMetaSectionShown(
				makeState({ selection: selectionOf(["rect-1"]) }),
				objectPartKind,
			),
		).toBe(true);
	});

	it("shows it for a selected connector", () => {
		expect(
			isMetaSectionShown(
				makeState({ selection: selectionOf(["conn-1"]) }),
				objectPartKind,
			),
		).toBe(true);
	});

	it("hides it for a multi-selection, which names no single note", () => {
		expect(
			isMetaSectionShown(
				makeState({ selection: selectionOf(["rect-1", "rect-2"]) }),
				objectPartKind,
			),
		).toBe(false);
	});

	it("hides it while nothing is selected", () => {
		expect(isMetaSectionShown(makeState({}), objectPartKind)).toBe(false);
	});

	it("hides it while a text slot is selected", () => {
		const state = makeState({
			selection: selectionOf(["card-1"], {
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "body", focusId: "body" }],
			}),
			objects: { "card-1": slottedShape("card-1") },
		});

		expect(isMetaSectionShown(state, objectPartKind)).toBe(false);
	});

	it("hides it while a shape's text is being edited", () => {
		const state = makeState({
			selection: selectionOf(["card-1"], textSlotPartSelection("body")),
			textEditState: { kind: "shape", text: [] },
			objects: { "card-1": slottedShape("card-1") },
		});

		expect(isMetaSectionShown(state, objectPartKind)).toBe(false);
	});

	it("shows it while a picked part's kind declares no style kinds (a vertex)", () => {
		const state = makeState({
			selection: selectionOf(["line-1"], {
				kind: "vertex",
				ranges: [{ anchorId: "0", focusId: "0" }],
			}),
			objects: {
				"line-1": { id: "line-1", type: "line" } as unknown as ObjectState,
			},
		});

		expect(isMetaSectionShown(state, objectPartKind)).toBe(true);
	});
});

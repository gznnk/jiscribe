import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../../selection/__tests__/support/vertexPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../selection/partKinds/textSlotPartKind";
import { isTextAddressed } from "../isTextAddressed";

const makeState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selection: selectionOf(["rect-1"]),
		textEditState: null,
		...overrides,
	}) as unknown as CanvasControllerState;

describe("isTextAddressed", () => {
	it("holds while a shape's text is being edited", () => {
		expect(
			isTextAddressed(
				makeState({
					textEditState: { kind: "shape", text: "hi" },
				} as unknown as Partial<CanvasControllerState>),
			),
		).toBe(true);
	});

	it("holds while a text slot is picked", () => {
		expect(
			isTextAddressed(
				makeState({
					selection: selectionOf(["rect-1"], {
						kind: TEXT_SLOT_PART_KIND,
						ranges: [{ anchorId: "body", focusId: "body" }],
					}),
				}),
			),
		).toBe(true);
	});

	it("does not hold for a picked vertex, which leaves the object the subject", () => {
		expect(
			isTextAddressed(
				makeState({
					selection: selectionOf(["rect-1"], vertexPartSelection(0)),
				}),
			),
		).toBe(false);
	});

	it("does not hold for a plain object selection", () => {
		expect(isTextAddressed(makeState({}))).toBe(false);
	});
});

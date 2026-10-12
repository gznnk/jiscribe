import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { TEXT_STYLE_INTENT_KINDS } from "../../../style/StyleIntent";
import { selectionOf } from "../../__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../__tests__/support/textSlotPartSelection";
import { vertexPartSelection } from "../../__tests__/support/vertexPartSelection";
import type { ObjectPartSelection } from "../../CanvasSelection";
import { readPickedPartStyleIntentKinds } from "../readPickedPartStyleIntentKinds";

// The bundle applyObjectDefinition built: the rect's textSlot kind and the
// polyline's vertex kind are the ones it registers.
const { objectPartKind } = createTestRegistries();

const stateOf = (
	type: string,
	part: ObjectPartSelection | null,
): Pick<CanvasControllerState, "selection" | "objects"> =>
	({
		objects: { "a-1": { id: "a-1", type } },
		selection: selectionOf(["a-1"], part),
	}) as unknown as CanvasControllerState;

describe("readPickedPartStyleIntentKinds", () => {
	it("answers the text kinds while a rect's body is picked", () => {
		expect(
			readPickedPartStyleIntentKinds(
				stateOf("rect", textSlotPartSelection("body")),
				objectPartKind,
			),
		).toBe(TEXT_STYLE_INTENT_KINDS);
	});

	it("answers null while a vertex is picked, its kind declaring none", () => {
		expect(objectPartKind.get("polyline", "vertex")).toBeDefined();
		expect(
			readPickedPartStyleIntentKinds(
				stateOf("polyline", vertexPartSelection(0)),
				objectPartKind,
			),
		).toBeNull();
	});

	it("answers null while nothing is picked", () => {
		expect(
			readPickedPartStyleIntentKinds(stateOf("rect", null), objectPartKind),
		).toBe(null);
	});

	it("answers null when the owner is gone from the objects", () => {
		const state = {
			objects: {},
			selection: selectionOf(["a-1"], textSlotPartSelection("body")),
		} as unknown as CanvasControllerState;
		expect(readPickedPartStyleIntentKinds(state, objectPartKind)).toBeNull();
	});
});

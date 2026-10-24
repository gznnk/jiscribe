import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import { createTextSlotPartRegistry } from "../../../../../selection/__tests__/support/textSlotPartRegistry";
import { textSlotPartSelection } from "../../../../../selection/__tests__/support/textSlotPartSelection";
import { isArrangeSectionShown } from "../isArrangeSectionShown";

const objectOf = (id: string, type: string, parentId?: string): ObjectState =>
	({ id, type, parentId }) as unknown as ObjectState;

const objectPartKind = createTextSlotPartRegistry("card");

const makeState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selection: selectionOf([]),
		mode: { kind: "normal" },
		objects: {},
		...overrides,
	}) as unknown as CanvasControllerState;

describe("isArrangeSectionShown", () => {
	it("shows the section for a selection under one parent", () => {
		const state = makeState({
			selection: selectionOf(["r1"]),
			objects: { r1: objectOf("r1", "rect") },
		});

		expect(isArrangeSectionShown(state, objectPartKind)).toBe(true);
	});

	it("shows it for a selection across parents, which can still be grouped", () => {
		const state = makeState({
			selection: selectionOf(["r1", "r2"]),
			objects: {
				g1: objectOf("g1", "group"),
				r1: objectOf("r1", "rect", "g1"),
				r2: objectOf("r2", "rect"),
			},
		});

		expect(isArrangeSectionShown(state, objectPartKind)).toBe(true);
	});

	it("hides it while nothing is selected", () => {
		expect(isArrangeSectionShown(makeState({}), objectPartKind)).toBe(false);
	});

	it("keeps it while a picked part narrows the panel, for the stacking order", () => {
		const state = makeState({
			selection: selectionOf(["card-1"], textSlotPartSelection("body")),
			objects: { "card-1": objectOf("card-1", "card") },
		});

		expect(isArrangeSectionShown(state, objectPartKind)).toBe(true);
	});
});

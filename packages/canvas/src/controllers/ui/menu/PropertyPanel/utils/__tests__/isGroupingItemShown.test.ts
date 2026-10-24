import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import { createTextSlotPartRegistry } from "../../../../../selection/__tests__/support/textSlotPartRegistry";
import { textSlotPartSelection } from "../../../../../selection/__tests__/support/textSlotPartSelection";
import { isGroupingItemShown } from "../isGroupingItemShown";

const objectOf = (id: string, type: string): ObjectState =>
	({ id, type }) as unknown as ObjectState;

/**
 * Slots declared on "group" too, so a fixture can pick a part under a sole
 * selected group — the one selection a pick could share with the button.
 */
const objectPartKind = createTextSlotPartRegistry("card", "group");

const makeState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selection: selectionOf([]),
		mode: { kind: "normal" },
		objects: {},
		...overrides,
	}) as unknown as CanvasControllerState;

describe("isGroupingItemShown", () => {
	it("shows the button for a multi-selection", () => {
		const state = makeState({
			selection: selectionOf(["r1", "r2"]),
			objects: { r1: objectOf("r1", "rect"), r2: objectOf("r2", "rect") },
		});

		expect(isGroupingItemShown(state, objectPartKind)).toBe(true);
	});

	it("shows it for a sole selected group", () => {
		const state = makeState({
			selection: selectionOf(["g1"]),
			objects: { g1: objectOf("g1", "group") },
		});

		expect(isGroupingItemShown(state, objectPartKind)).toBe(true);
	});

	it("hides it for a sole selected object that is not a group", () => {
		const state = makeState({
			selection: selectionOf(["card-1"]),
			objects: { "card-1": objectOf("card-1", "card") },
		});

		expect(isGroupingItemShown(state, objectPartKind)).toBe(false);
	});

	it("hides it while a picked part narrows the panel", () => {
		const state = makeState({
			selection: selectionOf(["g1"], textSlotPartSelection("body")),
			objects: { g1: objectOf("g1", "group") },
		});

		expect(isGroupingItemShown(state, objectPartKind)).toBe(false);
	});
});

import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createTestRegistries } from "../../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { applyStylePropertyPart } from "../applyStylePropertyPart";
import { parseMenuPart } from "../menuParts";

const registries = createTestRegistries();

const makeState = (): CanvasControllerState =>
	({
		registries,
		objects: {
			"rect-1": {
				id: "rect-1",
				type: "rect",
				features: RectFeatures,
				cx: 0,
				cy: 0,
				width: 100,
				height: 50,
				fill: "#ffffff",
				strokeWidth: 1,
			} as unknown as ObjectState,
		},
		rootIds: ["rect-1"],
		selectedIds: ["rect-1"],
		selectedConnectorId: null,
		selectedVertex: { objectId: "rect-1", vertexIndex: 0 },
		selectedTextSlot: null,
		multiSelectGroup: null,
		textEditState: null,
		commitVersion: 5,
	}) as unknown as CanvasControllerState;

type EventType =
	"pressed" | "click" | "doubleClick" | "dragStart" | "drag" | "dragEnd";

const apply = (
	state: CanvasControllerState,
	type: EventType,
	targetPart: string | undefined,
	inputValue?: string,
) =>
	applyStylePropertyPart(
		state,
		{ type, targetPart, inputValue } as unknown as CanvasEvent,
		parseMenuPart(targetPart),
		registries,
	);

const rectOf = (state: CanvasControllerState | null) =>
	state?.objects["rect-1"] as unknown as { fill: string; strokeWidth: number };

describe("applyStylePropertyPart", () => {
	it("leaves every part that is not a style write to the caller", () => {
		const state = makeState();
		for (const part of [
			undefined,
			"panel",
			"command:group",
			"toggle:style",
			"doc:view.open:fit-all",
		]) {
			expect(apply(state, "click", part)).toBeNull();
		}
	});

	describe("set:", () => {
		it.each(["click", "doubleClick"] as const)(
			"a %s writes the value, bumps commitVersion and clears selectedVertex",
			(type) => {
				const next = apply(makeState(), type, "set:fill:#dc2626");
				expect(rectOf(next).fill).toBe("#dc2626");
				expect(next?.commitVersion).toBe(6);
				expect(next?.selectedVertex).toBeNull();
			},
		);

		it.each(["pressed", "dragStart", "drag", "dragEnd"] as const)(
			"a %s returns the state untouched",
			(type) => {
				const state = makeState();
				expect(apply(state, type, "set:fill:#dc2626")).toBe(state);
			},
		);
	});

	describe("slider:", () => {
		it.each(["pressed", "dragStart", "drag"] as const)(
			"a %s previews the value without bumping commitVersion",
			(type) => {
				const next = apply(makeState(), type, "slider:strokeWidth", "4");
				expect(rectOf(next).strokeWidth).toBe(4);
				expect(next?.commitVersion).toBe(5);
				expect(next?.selectedVertex).toBeNull();
			},
		);

		it.each(["dragEnd", "click", "doubleClick"] as const)(
			"a %s commits the value (commitVersion bumped)",
			(type) => {
				const next = apply(makeState(), type, "slider:strokeWidth", "6");
				expect(rectOf(next).strokeWidth).toBe(6);
				expect(next?.commitVersion).toBe(6);
				expect(next?.selectedVertex).toBeNull();
			},
		);

		it("warns and changes nothing without an input value or a property", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const state = makeState();
			expect(apply(state, "drag", "slider:strokeWidth")).toBe(state);
			expect(apply(state, "drag", "slider:", "4")).toBe(state);
			expect(warnSpy).toHaveBeenCalledTimes(2);
			warnSpy.mockRestore();
		});
	});
});

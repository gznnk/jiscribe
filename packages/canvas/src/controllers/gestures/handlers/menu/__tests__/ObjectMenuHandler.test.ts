import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ObjectMenuHandler } from "../ObjectMenuHandler";

const registries = createTestRegistries();

const makeRect = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		features: RectFeatures,
		cx: 0,
		cy: 0,
		width: 100,
		height: 50,
		fill: "#ffffff",
		strokeWidth: 1,
	}) as unknown as ObjectState;

const makeState = (): CanvasControllerState =>
	({
		registries,
		objects: { "rect-1": makeRect("rect-1") },
		rootIds: ["rect-1"],
		selectedIds: ["rect-1"],
		selectedConnectorId: null,
		selectedVertex: { objectId: "rect-1", vertexIndex: 0 },
		selectedTextSlot: null,
		multiSelectGroup: null,
		textEditState: null,
		objectMenuOpenId: null,
		contextMenuPosition: { x: 1, y: 1 },
		commitVersion: 5,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick" | "drag" | "dragEnd",
	targetPart: string | undefined,
	inputValue?: string,
	targetKind = "menu",
	targetId = "object-menu",
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		targetPart,
		inputValue,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const fillOf = (state: CanvasControllerState) =>
	(state.objects["rect-1"] as unknown as { fill: string }).fill;

describe("ObjectMenuHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=object-menu)", () => {
			expect(
				ObjectMenuHandler.supports(makeEvent("click", "set:fill:#dc2626")),
			).toBe(true);
			expect(
				ObjectMenuHandler.supports(
					makeEvent("click", "set:fill:#dc2626", undefined, "menu", "toolbar"),
				),
			).toBe(false);
			expect(
				ObjectMenuHandler.supports(
					makeEvent("click", "set:fill:#dc2626", undefined, "control"),
				),
			).toBe(false);
		});
	});

	describe("set:{property}:{value}", () => {
		it("updates the selected object's property, bumps commitVersion, and clears selectedVertex", () => {
			const next = ObjectMenuHandler.handle(
				makeState(),
				makeEvent("click", "set:fill:#dc2626"),
				registries,
			);
			expect(fillOf(next)).toBe("#dc2626");
			expect(next.commitVersion).toBe(6);
			expect(next.selectedVertex).toBeNull();
		});

		it("a doubleClick activates like a click (a rapid second press of a value-dependent toggle, e.g. bold → normal, arrives as doubleClick)", () => {
			const next = ObjectMenuHandler.handle(
				makeState(),
				makeEvent("doubleClick", "set:fill:#dc2626"),
				registries,
			);
			expect(fillOf(next)).toBe("#dc2626");
			expect(next.commitVersion).toBe(6);
		});
	});

	describe("toggle:{sectionId}", () => {
		it("opens the section, and toggles it closed on the second click", () => {
			const opened = ObjectMenuHandler.handle(
				makeState(),
				makeEvent("click", "toggle:bg-color"),
				registries,
			);
			expect(opened.objectMenuOpenId).toBe("bg-color");

			const closed = ObjectMenuHandler.handle(
				opened,
				makeEvent("click", "toggle:bg-color"),
				registries,
			);
			expect(closed.objectMenuOpenId).toBeNull();
		});
	});

	describe("slider:{property}", () => {
		it("a drag updates the property in real time without bumping commitVersion", () => {
			const next = ObjectMenuHandler.handle(
				makeState(),
				makeEvent("drag", "slider:strokeWidth", "4"),
				registries,
			);
			expect(
				(next.objects["rect-1"] as unknown as { strokeWidth: number })
					.strokeWidth,
			).toBe(4);
			expect(next.commitVersion).toBe(5);
			expect(next.selectedVertex).toBeNull();
		});

		it("a dragEnd commits the final value (commitVersion bumped)", () => {
			const next = ObjectMenuHandler.handle(
				makeState(),
				makeEvent("dragEnd", "slider:strokeWidth", "6"),
				registries,
			);
			expect(
				(next.objects["rect-1"] as unknown as { strokeWidth: number })
					.strokeWidth,
			).toBe(6);
			expect(next.commitVersion).toBe(6);
		});

		it("a click on the track commits the value the native jump produced (#248)", () => {
			const next = ObjectMenuHandler.handle(
				makeState(),
				makeEvent("click", "slider:strokeWidth", "7"),
				registries,
			);
			expect(
				(next.objects["rect-1"] as unknown as { strokeWidth: number })
					.strokeWidth,
			).toBe(7);
			expect(next.commitVersion).toBe(6);
			expect(next.selectedVertex).toBeNull();
		});

		it("a doubleClick on the track commits like a click (two rapid track clicks pair up)", () => {
			const next = ObjectMenuHandler.handle(
				makeState(),
				makeEvent("doubleClick", "slider:strokeWidth", "9"),
				registries,
			);
			expect(
				(next.objects["rect-1"] as unknown as { strokeWidth: number })
					.strokeWidth,
			).toBe(9);
			expect(next.commitVersion).toBe(6);
		});

		it("a pressed on the slider changes no property (the value is committed on release)", () => {
			const state = makeState();
			const next = ObjectMenuHandler.handle(
				state,
				makeEvent("pressed", "slider:strokeWidth", "7"),
				registries,
			);
			expect(next.objects).toBe(state.objects);
			expect(next.commitVersion).toBe(5);
		});
	});

	describe("menu chrome (no part)", () => {
		it("a pressed closes the context menu; a click does nothing", () => {
			const pressed = ObjectMenuHandler.handle(
				makeState(),
				makeEvent("pressed", undefined),
				registries,
			);
			expect(pressed.contextMenuPosition).toBeNull();

			const state = makeState();
			const clicked = ObjectMenuHandler.handle(
				state,
				makeEvent("click", undefined),
				registries,
			);
			expect(clicked.objects).toBe(state.objects);
			expect(clicked.commitVersion).toBe(5);
		});
	});
});

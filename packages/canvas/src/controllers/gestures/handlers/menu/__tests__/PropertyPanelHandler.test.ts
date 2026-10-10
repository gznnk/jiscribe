import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../../selection/__tests__/support/vertexPartSelection";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { PropertyPanelHandler } from "../PropertyPanelHandler";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		propertyPanel: { isOpen: true, collapsedSectionIds: [] },
		stencilLibraryOpenCategory: "flowchart",
		selection: selectionOf(["a"]),
		contextMenuPosition: { x: 1, y: 1 },
		...overrides,
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick" | "drag" | "dragEnd",
	targetId: string,
	targetAction?: string,
	targetKind = "menu",
	inputValue?: string,
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		targetAction,
		inputValue,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

describe("PropertyPanelHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=property-panel)", () => {
			expect(
				PropertyPanelHandler.supports(
					makeEvent("click", "property-panel", "command:togglePropertyPanel"),
				),
			).toBe(true);
			expect(
				PropertyPanelHandler.supports(
					makeEvent("click", "stencil-library-panel", "close"),
				),
			).toBe(false);
			expect(
				PropertyPanelHandler.supports(
					makeEvent(
						"click",
						"property-panel",
						"command:togglePropertyPanel",
						"control",
					),
				),
			).toBe(false);
		});
	});

	it("a click on the close button closes the panel", () => {
		const next = PropertyPanelHandler.handle(
			makeState(),
			makeEvent("click", "property-panel", "command:togglePropertyPanel"),
			registries,
		);
		expect(next.propertyPanel.isOpen).toBe(false);
	});

	it("a press dismisses the context menu and the category flyout", () => {
		const next = PropertyPanelHandler.handle(
			makeState(),
			makeEvent("pressed", "property-panel"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
		// The panel is persistent chrome, so a press on it leaves it open
		expect(next.propertyPanel.isOpen).toBe(true);
		expect(next.selection.objectIds).toEqual(["a"]);
	});

	it("a click on the panel's own background changes nothing", () => {
		const state = makeState();
		const next = PropertyPanelHandler.handle(
			state,
			makeEvent("click", "property-panel"),
			registries,
		);
		expect(next).toBe(state);
	});

	it("ignores an action that is not a command", () => {
		const state = makeState();
		const next = PropertyPanelHandler.handle(
			state,
			makeEvent("click", "property-panel", "section:style"),
			registries,
		);
		expect(next).toBe(state);
	});

	describe("document parts", () => {
		it("states a view mode and raises commitVersion so the gesture records it", () => {
			const state = makeState({ commitVersion: 3 });
			const next = PropertyPanelHandler.handle(
				state,
				makeEvent("click", "property-panel", "doc:view.open:fit-width"),
				registries,
			);
			expect(next.view).toEqual({ open: "fit-width" });
			expect(next.commitVersion).toBe(4);
		});

		it("drops the setting for an empty value, and the view with it", () => {
			const state = makeState({
				commitVersion: 3,
				view: { scroll: "content" },
			});
			const next = PropertyPanelHandler.handle(
				state,
				makeEvent("doubleClick", "property-panel", "doc:view.scroll:"),
				registries,
			);
			expect(next.view).toBeUndefined();
			expect(next.commitVersion).toBe(4);
		});

		it("records nothing for the value the document already holds", () => {
			const state = makeState({ commitVersion: 3, view: { open: "fit-all" } });
			const next = PropertyPanelHandler.handle(
				state,
				makeEvent("click", "property-panel", "doc:view.open:fit-all"),
				registries,
			);
			expect(next).toBe(state);
		});

		it("ignores and warns about a value the setting does not take, and an unknown setting", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const state = makeState({ commitVersion: 3 });
			for (const action of [
				"doc:view.open:fit-height",
				"doc:view.scroll:none",
				"doc:view.padding.top:-4",
				"doc:view.padding.top:",
				"doc:view.zoom:2",
			]) {
				expect(
					PropertyPanelHandler.handle(
						state,
						makeEvent("click", "property-panel", action),
						registries,
					),
				).toBe(state);
			}
			expect(warnSpy).toHaveBeenCalledTimes(5);
			warnSpy.mockRestore();
		});

		it("writes nothing on a press, only on the click that follows", () => {
			const state = makeState({ commitVersion: 3 });
			const next = PropertyPanelHandler.handle(
				state,
				makeEvent("pressed", "property-panel", "doc:view.open:fit-all"),
				registries,
			);
			expect(next.view).toBeUndefined();
			expect(next.commitVersion).toBe(3);
		});
	});

	describe("style parts", () => {
		const makeStyledState = () =>
			makeState({
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
				selection: selectionOf(["rect-1"], vertexPartSelection(0)),
				multiSelectGroup: null,
				textEditState: null,
				commitVersion: 5,
			});
		const rectOf = (state: CanvasControllerState) =>
			state.objects["rect-1"] as unknown as {
				fill: string;
				strokeWidth: number;
			};

		it("a click on a set: action writes the selection's style and bumps commitVersion", () => {
			const next = PropertyPanelHandler.handle(
				makeStyledState(),
				makeEvent("click", "property-panel", "set:fill:#dc2626"),
				registries,
			);
			expect(rectOf(next).fill).toBe("#dc2626");
			expect(next.commitVersion).toBe(6);
			// Styling renumbers nothing, so what is picked below the object stays picked.
			expect(next.selection.part).toEqual(vertexPartSelection(0));
		});

		it("a slider previews on drag and commits on dragEnd", () => {
			const dragged = PropertyPanelHandler.handle(
				makeStyledState(),
				makeEvent("drag", "property-panel", "slider:strokeWidth", "menu", "4"),
				registries,
			);
			expect(rectOf(dragged).strokeWidth).toBe(4);
			expect(dragged.commitVersion).toBe(5);

			const committed = PropertyPanelHandler.handle(
				dragged,
				makeEvent(
					"dragEnd",
					"property-panel",
					"slider:strokeWidth",
					"menu",
					"6",
				),
				registries,
			);
			expect(rectOf(committed).strokeWidth).toBe(6);
			expect(committed.commitVersion).toBe(6);
		});

		it("a press on a slider previews and still does the panel's dismiss", () => {
			const next = PropertyPanelHandler.handle(
				makeStyledState(),
				makeEvent(
					"pressed",
					"property-panel",
					"slider:strokeWidth",
					"menu",
					"7",
				),
				registries,
			);
			expect(rectOf(next).strokeWidth).toBe(7);
			expect(next.contextMenuPosition).toBeNull();
			expect(next.stencilLibraryOpenCategory).toBeNull();
		});
	});
});

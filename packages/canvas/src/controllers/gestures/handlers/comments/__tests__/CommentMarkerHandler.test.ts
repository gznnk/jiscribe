import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { CommentMarkerHandler } from "../CommentMarkerHandler";

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

const makeConnector = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		source: { objectId: "rect-1" },
		target: { objectId: "rect-2" },
		points: [],
	}) as unknown as ObjectState;

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		registries,
		objects: {
			"rect-1": makeRect("rect-1"),
			"rect-2": makeRect("rect-2"),
			"conn-1": makeConnector("conn-1"),
		},
		rootIds: ["rect-1", "rect-2", "conn-1"],
		selectedIds: [],
		selectedConnectorId: null,
		selectedVertex: null,
		selectedTextSlot: null,
		multiSelectGroup: null,
		textEditState: null,
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
		contextMenuPosition: { clientX: 1, clientY: 1 },
		commitVersion: 0,
		...overrides,
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "dragStart",
	targetId: string,
	targetKind = "comment-marker",
	button = 0,
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		button,
		pointerType: "mouse",
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

describe("CommentMarkerHandler", () => {
	describe("supports", () => {
		it("accepts left-button marker interactions only", () => {
			expect(CommentMarkerHandler.supports(makeEvent("click", "rect-1"))).toBe(
				true,
			);
			expect(
				CommentMarkerHandler.supports(
					makeEvent("click", "rect-1", "object", 0),
				),
			).toBe(false);
			expect(
				CommentMarkerHandler.supports(
					makeEvent("click", "rect-1", "comment-marker", 2),
				),
			).toBe(false);
		});
	});

	it("selects the object and opens the comment section on click", () => {
		const next = CommentMarkerHandler.handle(
			makeState(),
			makeEvent("click", "rect-1"),
			registries,
		);

		expect(next.selectedIds).toEqual(["rect-1"]);
		expect(next.selectedConnectorId).toBeNull();
		expect(next.objectMenuOpenId).toBe("comments");
		expect(next.contextMenuPosition).toBeNull();
		expect(next.multiSelectGroup).toBeNull();
	});

	it("narrows a multi-selection down to the marked object", () => {
		const next = CommentMarkerHandler.handle(
			makeState({ selectedIds: ["rect-1", "rect-2"] }),
			makeEvent("click", "rect-1"),
			registries,
		);

		expect(next.selectedIds).toEqual(["rect-1"]);
		expect(next.objectMenuOpenId).toBe("comments");
	});

	it("selects a connector through its own channel", () => {
		const next = CommentMarkerHandler.handle(
			makeState({ selectedIds: ["rect-1"] }),
			makeEvent("click", "conn-1"),
			registries,
		);

		expect(next.selectedConnectorId).toBe("conn-1");
		expect(next.selectedIds).toEqual([]);
		expect(next.objectMenuOpenId).toBe("comments");
	});

	it("leaves the selection alone on press, closing only the context menu", () => {
		const state = makeState({ selectedIds: ["rect-2"] });
		const next = CommentMarkerHandler.handle(
			state,
			makeEvent("pressed", "rect-1"),
			registries,
		);

		expect(next.selectedIds).toEqual(["rect-2"]);
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.contextMenuPosition).toBeNull();
	});

	it("ignores a drag, so the marker never moves what it sits on", () => {
		const state = makeState({ selectedIds: ["rect-2"] });
		const next = CommentMarkerHandler.handle(
			state,
			makeEvent("dragStart", "rect-1"),
			registries,
		);

		expect(next.selectedIds).toEqual(["rect-2"]);
		expect(next.objectMenuOpenId).toBeNull();
	});

	it("does nothing for a marker naming an object that is gone", () => {
		const state = makeState();
		const next = CommentMarkerHandler.handle(
			state,
			makeEvent("click", "missing"),
			registries,
		);

		expect(next.selectedIds).toEqual([]);
		// The section still opens, but with nothing selected the panel names no target.
		expect(next.objectMenuOpenId).toBe("comments");
	});
});

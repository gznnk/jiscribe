import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { resolveDocSnapshot } from "../../utils/resolveDocSnapshot";
import {
	createInitialControllerState,
	INITIAL_VIEWPORT,
} from "../createInitialControllerState";

const registries = createTestRegistries();

const docWithRect: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 10,
			height: 10,
		},
	],
} as unknown as CanvasDoc;

describe("createInitialControllerState", () => {
	it("converts the Doc to state while initializing editing-related defaults to empty", () => {
		const state = createInitialControllerState(docWithRect, registries);

		expect(state.objects["rect-1"]).toMatchObject({ cx: 5, cy: 5 });
		expect(state.selection.objectIds).toEqual([]);
		expect(state.drag).toBeNull();
		expect(state.multiSelectGroup).toBeNull();
		expect(state.mode).toEqual({ kind: "normal" });
		expect(state.commitVersion).toBe(0);
		expect(state.saveRequest.version).toBe(0);
	});

	it("history has empty past/future and the initial Doc as present", () => {
		const state = createInitialControllerState(docWithRect, registries);

		expect(state.history.past).toEqual([]);
		expect(state.history.future).toEqual([]);
		// The initial present wraps the original doc verbatim (no round-trip conversion)
		expect(
			resolveDocSnapshot(state.history.present, registries.objectMapper),
		).toBe(docWithRect);
	});

	it("returns an independent state on each call (does not share caches, etc.)", () => {
		const a = createInitialControllerState(docWithRect, registries);
		const b = createInitialControllerState(docWithRect, registries);

		expect(a).not.toBe(b);
		expect(a.dragStartCaches).not.toBe(b.dragStartCaches);
		expect(a.history).not.toBe(b.history);
	});

	it("starts at INITIAL_VIEWPORT when no initialCamera is given", () => {
		const state = createInitialControllerState(docWithRect, registries);

		expect(state.viewport).toEqual(INITIAL_VIEWPORT);
		// A copy, so freezing or replacing one canvas's viewport cannot reach the
		// constant every other canvas starts from.
		expect(state.viewport).not.toBe(INITIAL_VIEWPORT);
	});

	it("seeds the viewport camera from initialCamera without touching width/height", () => {
		const base = createInitialControllerState(docWithRect, registries);
		const state = createInitialControllerState(docWithRect, registries, {
			minX: 10,
			minY: 20,
			zoom: 2,
		});

		// Camera adopted so the first paint lands at the host's pan/zoom (no flash).
		expect(state.viewport).toMatchObject({ minX: 10, minY: 20, zoom: 2 });
		// Width/height stay the placeholder (host does not control pixel size).
		expect(state.viewport.width).toBe(base.viewport.width);
		expect(state.viewport.height).toBe(base.viewport.height);
	});

	it("starts both sidebars closed, the stencil panel on the catalog, when no initialSidebars is given", () => {
		const state = createInitialControllerState(docWithRect, registries);

		expect(state.stencilLibraryPanel).toEqual({
			isOpen: false,
			content: { kind: "catalog" },
		});
		expect(state.stencilFlyout).toBeNull();
		expect(state.propertyPanel).toEqual({
			isOpen: false,
			collapsedSectionIds: [],
		});
	});

	it("seeds both sidebars from initialSidebars", () => {
		const state = createInitialControllerState(
			docWithRect,
			registries,
			undefined,
			undefined,
			{
				left: { isOpen: true },
				right: { isOpen: false },
				panels: {
					stencilLibrary: {
						content: { kind: "category", categoryId: "flowchart" },
					},
					properties: { collapsedSectionIds: ["text"] },
				},
			},
		);

		expect(state.stencilLibraryPanel).toEqual({
			isOpen: true,
			content: { kind: "category", categoryId: "flowchart" },
		});
		expect(state.propertyPanel).toEqual({
			isOpen: false,
			collapsedSectionIds: ["text"],
		});
	});

	it("leaves the stencil panel at its default when only properties is given", () => {
		const state = createInitialControllerState(
			docWithRect,
			registries,
			undefined,
			undefined,
			{ panels: { properties: { collapsedSectionIds: ["text"] } } },
		);

		expect(state.stencilLibraryPanel).toEqual({
			isOpen: false,
			content: { kind: "catalog" },
		});
		expect(state.propertyPanel).toEqual({
			isOpen: false,
			collapsedSectionIds: ["text"],
		});
	});

	it("leaves the right edge closed when only left is given", () => {
		const state = createInitialControllerState(
			docWithRect,
			registries,
			undefined,
			undefined,
			{ left: { isOpen: true } },
		);

		expect(state.stencilLibraryPanel).toEqual({
			isOpen: true,
			content: { kind: "catalog" },
		});
		expect(state.propertyPanel).toEqual({
			isOpen: false,
			collapsedSectionIds: [],
		});
	});

	it("pins nothing when no initialPinnedCategoryIds is given", () => {
		const state = createInitialControllerState(docWithRect, registries);

		expect(state.pinnedCategoryIds).toEqual([]);
	});

	it("seeds the pins in the order given, ids the library may not hold included", () => {
		const initialPinnedCategoryIds = ["flowchart", "no-such-category"];
		const state = createInitialControllerState(
			docWithRect,
			registries,
			undefined,
			undefined,
			undefined,
			initialPinnedCategoryIds,
		);

		expect(state.pinnedCategoryIds).toEqual(["flowchart", "no-such-category"]);
		// A copy: the reducer's later writes never reach the host's array.
		expect(state.pinnedCategoryIds).not.toBe(initialPinnedCategoryIds);
	});

	/** A pin toggle would take both off at once, and the rail keys its buttons by id. */
	it("throws when a category is pinned twice", () => {
		expect(() =>
			createInitialControllerState(
				docWithRect,
				registries,
				undefined,
				undefined,
				undefined,
				["flowchart", "uml", "flowchart"],
			),
		).toThrow(/"flowchart" twice/);
	});
});

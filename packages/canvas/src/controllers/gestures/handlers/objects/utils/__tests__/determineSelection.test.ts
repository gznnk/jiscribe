import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { Mods } from "../../../../registry/ObjectBehaviorTypes";
import { determineSelection } from "../determineSelection";

const rectObj = (id: string, parentId?: string): ObjectState =>
	({ id, type: "rect", parentId }) as unknown as ObjectState;

const groupObj = (
	id: string,
	childIds: string[],
	parentId?: string,
): ObjectState =>
	({ id, type: "group", childIds, parentId }) as unknown as ObjectState;

const makeState = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): CanvasControllerState =>
	({
		selectedIds,
		selectedConnectorId: null,
		objects,
	}) as unknown as CanvasControllerState;

const noMods: Mods = { ctrl: false, meta: false, shift: false, alt: false };
const ctrlMods: Mods = { ctrl: true, meta: false, shift: false, alt: false };

// Shared object set
// root-rect: a root-level rectangle
// group1: a group containing rect1, rect2
// group2: a nested group containing group1
const baseObjects = {
	"root-rect": rectObj("root-rect"),
	group1: groupObj("group1", ["rect1", "rect2"]),
	rect1: rectObj("rect1", "group1"),
	rect2: rectObj("rect2", "group1"),
	group2: groupObj("group2", ["group1"]),
};

const nestedObjects = {
	...baseObjects,
	group1: groupObj("group1", ["rect1", "rect2"], "group2"),
};

describe("determineSelection", () => {
	describe("root-level objects (non-group)", () => {
		it("returns [id] when unselected", () => {
			const state = makeState([], baseObjects);
			const result = determineSelection(rectObj("root-rect"), state, noMods);
			expect(result).toEqual(["root-rect"]);
		});

		it("returns null when already selected and without Ctrl (no change)", () => {
			const state = makeState(["root-rect"], baseObjects);
			const result = determineSelection(rectObj("root-rect"), state, noMods);
			expect(result).toBeNull();
		});

		it("returns a deselection ([]) when already selected and with Ctrl", () => {
			const state = makeState(["root-rect"], baseObjects);
			const result = determineSelection(rectObj("root-rect"), state, ctrlMods);
			expect(result).toEqual([]);
		});

		it("adds to selection when unselected, with Ctrl, and other items are selected", () => {
			const state = makeState(["root-rect"], {
				"root-rect": rectObj("root-rect"),
				"other-rect": rectObj("other-rect"),
			});
			const result = determineSelection(rectObj("other-rect"), state, ctrlMods);
			expect(result).not.toBeNull();
			expect(result).toContain("root-rect");
			expect(result).toContain("other-rect");
		});
	});

	describe("objects inside a group", () => {
		it("ancestor unselected, nothing else selected -> selects the topmost group", () => {
			const state = makeState([], nestedObjects);
			const result = determineSelection(
				rectObj("rect1", "group1"),
				state,
				noMods,
			);
			expect(result).toEqual(["group2"]);
		});

		it("immediate parent group selected, child unselected -> selects the child", () => {
			const state = makeState(["group1"], baseObjects);
			const result = determineSelection(
				rectObj("rect1", "group1"),
				state,
				noMods,
			);
			expect(result).toEqual(["rect1"]);
		});

		it("immediate parent group selected, child already selected -> null (no change)", () => {
			const state = makeState(["group1", "rect1"], baseObjects);
			const result = determineSelection(
				rectObj("rect1", "group1"),
				state,
				noMods,
			);
			expect(result).toBeNull();
		});

		it("selects itself at the same level when a sibling is already selected", () => {
			const state = makeState(["rect1"], baseObjects);
			const result = determineSelection(
				rectObj("rect2", "group1"),
				state,
				noMods,
			);
			expect(result).not.toBeNull();
			expect(result).toContain("rect2");
		});
	});

	describe("common ancestor (via hasSelectedDescendants)", () => {
		// group-top
		//   ├ group-a ─ rect-a
		//   └ group-b ─ rect-b
		// Clicking rect-a while rect-b is selected: since another subtree of the common
		// ancestor group-top has a selected item, align to group-a at the same level as rect-a.
		const commonAncestorObjects: Record<string, ObjectState> = {
			"group-top": groupObj("group-top", ["group-a", "group-b"]),
			"group-a": groupObj("group-a", ["rect-a"], "group-top"),
			"group-b": groupObj("group-b", ["rect-b"], "group-top"),
			"rect-a": rectObj("rect-a", "group-a"),
			"rect-b": rectObj("rect-b", "group-b"),
		};

		it("selects one level below the common ancestor when a descendant of another subtree is selected", () => {
			const state = makeState(["rect-b"], commonAncestorObjects);
			const result = determineSelection(
				rectObj("rect-a", "group-a"),
				state,
				noMods,
			);
			expect(result).toEqual(["group-a"]);
		});

		it("selects the topmost ancestor when no subtree has a selected item", () => {
			const state = makeState(["root-rect"], {
				...commonAncestorObjects,
				"root-rect": rectObj("root-rect"),
			});
			const result = determineSelection(
				rectObj("rect-a", "group-a"),
				state,
				noMods,
			);
			expect(result).toEqual(["group-top"]);
		});
	});

	describe("integration with autoSelectParentGroups", () => {
		it("selects the parent group when all children of a group are selected", () => {
			const state = makeState(["rect1"], baseObjects);
			// Add rect2 with Ctrl -> rect1 + rect2 completes group1's children -> promote to group1
			const result = determineSelection(
				rectObj("rect2", "group1"),
				state,
				ctrlMods,
			);
			expect(result).not.toBeNull();
			expect(result).toContain("group1");
			expect(result).not.toContain("rect1");
			expect(result).not.toContain("rect2");
		});
	});
});

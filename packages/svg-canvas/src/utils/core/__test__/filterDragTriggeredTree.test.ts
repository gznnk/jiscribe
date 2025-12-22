import type { DiagramType } from "../../../types/core/DiagramType";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { filterDragTriggeredTree } from "../filterDragTriggeredTree";

/**
 * Create a mock diagram item for testing
 * @param id - The ID of the diagram
 * @param isInDragTriggeredTree - Whether the item is in the drag-triggered tree
 * @param type - The type of the diagram
 * @returns Mock diagram item
 */
const createMockDiagram = (
	id: string,
	isInDragTriggeredTree: boolean = false,
	type: DiagramType = "Rectangle",
): Diagram => ({
	id,
	type,
	x: 0,
	y: 0,
	isInDragTriggeredTree,
});

/**
 * Create a mock group with items for testing
 * @param id - The ID of the group
 * @param items - The items contained in the group
 * @param isInDragTriggeredTree - Whether the group is in the drag-triggered tree
 * @returns Mock group data
 */
const createMockGroup = (
	id: string,
	items: Diagram[],
	isInDragTriggeredTree: boolean = false,
): GroupState => ({
	id,
	type: "Group",
	x: 100,
	y: 100,
	width: 200,
	height: 200,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	keepProportion: false,
	rotateEnabled: true,
	inversionEnabled: true,
	isSelected: false,
	isRootSelected: false,
	isAncestorSelected: false,
	showOutline: false,
	outlineDisabled: false,
	isTransforming: false,
	itemableType: "group",
	items,
	isInDragTriggeredTree,
});

describe("filterDragTriggeredTree", () => {
	it("should return empty array when no items are in drag-triggered tree", () => {
		const items = [
			createMockDiagram("item1", false),
			createMockDiagram("item2", false),
		];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([]);
	});

	it("should return only items that are in drag-triggered tree", () => {
		const item1 = createMockDiagram("item1", true);
		const item2 = createMockDiagram("item2", false);
		const item3 = createMockDiagram("item3", true);
		const items = [item1, item2, item3];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([item1, item3]);
	});

	it("should filter nested items in groups", () => {
		const childInTree = createMockDiagram("childInTree", true);
		const childNotInTree = createMockDiagram("childNotInTree", false);
		const group = createMockGroup(
			"group1",
			[childInTree, childNotInTree],
			true,
		);
		const items = [group];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([
			{
				...group,
				items: [childInTree],
			},
		]);
	});

	it("should filter deeply nested structures", () => {
		const deepChild = createMockDiagram("deepChild", true);
		const notInTreeChild = createMockDiagram("notInTreeChild", false);
		const innerGroup = createMockGroup(
			"innerGroup",
			[deepChild, notInTreeChild],
			true,
		);
		const outerGroup = createMockGroup("outerGroup", [innerGroup], true);
		const items = [outerGroup];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([
			{
				...outerGroup,
				items: [
					{
						...innerGroup,
						items: [deepChild],
					},
				],
			},
		]);
	});

	it("should exclude groups that are not in drag-triggered tree even if children are", () => {
		const childInTree = createMockDiagram("childInTree", true);
		const group = createMockGroup("group1", [childInTree], false);
		const items = [group];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([]);
	});

	it("should exclude groups with no children in drag-triggered tree", () => {
		const childNotInTree = createMockDiagram("childNotInTree", false);
		const group = createMockGroup("group1", [childNotInTree], true);
		const items = [group];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([]);
	});

	it("should handle empty items array", () => {
		const items: Diagram[] = [];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([]);
	});

	it("should handle mixed items at root level", () => {
		const item1 = createMockDiagram("item1", true);
		const item2 = createMockDiagram("item2", false);
		const childInTree = createMockDiagram("childInTree", true);
		const group = createMockGroup("group1", [childInTree], true);
		const items = [item1, item2, group];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([
			item1,
			{
				...group,
				items: [childInTree],
			},
		]);
	});

	it("should handle complex tree with multiple branches", () => {
		const leaf1 = createMockDiagram("leaf1", true);
		const leaf2 = createMockDiagram("leaf2", false);
		const leaf3 = createMockDiagram("leaf3", true);
		const branch1 = createMockGroup("branch1", [leaf1, leaf2], true);
		const branch2 = createMockGroup("branch2", [leaf3], true);
		const root = createMockGroup("root", [branch1, branch2], true);
		const items = [root];

		const result = filterDragTriggeredTree(items);

		expect(result).toEqual([
			{
				...root,
				items: [
					{
						...branch1,
						items: [leaf1],
					},
					{
						...branch2,
						items: [leaf3],
					},
				],
			},
		]);
	});
});

import type { DiagramType } from "../../../types/core/DiagramType";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { getAncestorItemsById } from "../getAncestorItemsById";

/**
 * Create a mock diagram item for testing
 * @param id - The ID of the diagram
 * @param type - The type of the diagram
 * @returns Mock diagram item
 */
const createMockDiagram = (
	id: string,
	type: DiagramType = "Rectangle",
): Diagram => ({
	id,
	type,
	x: 0,
	y: 0,
});

/**
 * Create a mock group with items for testing
 * @param id - The ID of the group
 * @param items - The items contained in the group
 * @returns Mock group data
 */
const createMockGroup = (id: string, items: Diagram[]): GroupState => ({
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
});

describe("getAncestorItemsById", () => {
	it("should return empty array when item is at root level", () => {
		const targetItem = createMockDiagram("item1");
		const items = [targetItem, createMockDiagram("item2")];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([]);
	});
	it("should return single ancestor when item is in one group", () => {
		const targetItem = createMockDiagram("item1");
		const group1 = createMockGroup("group1", [targetItem]);
		const items = [group1, createMockDiagram("item2")];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([group1]);
	});
	it("should return multiple ancestors in correct order when item is nested", () => {
		const targetItem = createMockDiagram("item1");
		const innerGroup = createMockGroup("innerGroup", [targetItem]);
		const outerGroup = createMockGroup("outerGroup", [innerGroup]);
		const items = [outerGroup, createMockDiagram("item2")];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([outerGroup, innerGroup]);
	});
	it("should return empty array when item is not found", () => {
		const targetItem = createMockDiagram("nonExistentItem");
		const group1 = createMockGroup("group1", [createMockDiagram("item1")]);
		const items = [group1, createMockDiagram("item2")];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([]);
	});
	it("should handle deeply nested structure", () => {
		const targetItem = createMockDiagram("deepItem");
		const level3Group = createMockGroup("level3", [targetItem]);
		const level2Group = createMockGroup("level2", [level3Group]);
		const level1Group = createMockGroup("level1", [level2Group]);
		const items = [level1Group, createMockDiagram("rootItem")];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([level1Group, level2Group, level3Group]);
	});

	it("should handle multiple groups with same nested item", () => {
		const targetItem = createMockDiagram("item1");
		const group1 = createMockGroup("group1", [targetItem]);
		const group2 = createMockGroup("group2", [createMockDiagram("item2")]);
		const items = [group1, group2];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([group1]);
	});

	it("should handle empty canvas", () => {
		const targetItem = createMockDiagram("item1");
		const items: Diagram[] = [];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([]);
	});
	it("should handle group with mixed items", () => {
		const targetItem = createMockDiagram("targetItem");
		const siblingItem = createMockDiagram("siblingItem");
		const parentGroup = createMockGroup("parentGroup", [
			siblingItem,
			targetItem,
		]);
		const items = [parentGroup, createMockDiagram("rootItem")];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([parentGroup]);
	});

	it("should handle complex nested structure with multiple branches", () => {
		const targetItem = createMockDiagram("target");
		const targetGroup = createMockGroup("targetGroup", [targetItem]);
		const siblingGroup = createMockGroup("siblingGroup", [
			createMockDiagram("sibling"),
		]);
		const parentGroup = createMockGroup("parentGroup", [
			targetGroup,
			siblingGroup,
		]);
		const items = [parentGroup, createMockDiagram("rootItem")];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([parentGroup, targetGroup]);
	});

	it("should handle item in group alongside other groups", () => {
		const targetItem = createMockDiagram("target");
		const emptyGroup = createMockGroup("emptyGroup", []);
		const targetGroup = createMockGroup("targetGroup", [
			targetItem,
			createMockDiagram("sibling"),
		]);
		const items = [emptyGroup, targetGroup, createMockDiagram("rootItem")];

		const result = getAncestorItemsById(targetItem.id, items);

		expect(result).toEqual([targetGroup]);
	});
	it("should find all groups when item appears in multiple groups", () => {
		// Note: This is an edge case - items shouldn't normally appear in multiple groups
		const targetItem = createMockDiagram("duplicateItem");
		const firstGroup = createMockGroup("firstGroup", [targetItem]);
		const secondGroup = createMockGroup("secondGroup", [targetItem]);
		const items = [firstGroup, secondGroup];

		const result = getAncestorItemsById(targetItem.id, items);

		// Should find all groups that contain the item
		expect(result).toEqual([firstGroup, secondGroup]);
	});
});

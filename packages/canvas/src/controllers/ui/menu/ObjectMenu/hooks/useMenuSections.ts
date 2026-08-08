import { useMemo } from "react";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { useCanvasRegistries } from "../../../../registries/CanvasRegistriesContext";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";
import { resolveSelectedTextSlot } from "../../../../utils/resolveSelectedTextSlot";
import type { ObjectMenuRegistry } from "../ObjectMenuRegistry";
import type { ObjectMenuItem, ObjectMenuSection } from "../ObjectMenuTypes";
import { filterTextSlotMenuSections } from "../utils/filterTextSlotMenuSections";

const itemKey = (item: ObjectMenuItem): string =>
	item.type === "custom" ? item.id : item.type;

/**
 * AND-merges the item lists of multiple object types.
 * Keeps only the items common to all types.
 * For borderStyle, radius is enabled only when every type has radius: true.
 */
const mergeItems = (arrays: ObjectMenuItem[][]): ObjectMenuItem[] => {
	if (arrays.length === 1) {
		return arrays[0];
	}

	return arrays[0]
		.filter((item) => {
			const key = itemKey(item);
			return arrays
				.slice(1)
				.every((arr) => arr.some((s) => itemKey(s) === key));
		})
		.map((item) => {
			if (item.type !== "borderStyle") {
				return item;
			}
			// Show radius only when every type has it set to true
			const allRadius = arrays.every((arr) => {
				const found = arr.find((s) => s.type === "borderStyle");
				return found?.type === "borderStyle" && found.radius === true;
			});
			return { type: "borderStyle" as const, radius: allRadius };
		});
};

/**
 * AND-merges the section lists of multiple object types.
 * Keeps only sections whose id is common to all types, and AND-merges the items
 * within each section as well.
 */
const mergeSections = (arrays: ObjectMenuSection[][]): ObjectMenuSection[] => {
	if (arrays.length === 0) {
		return [];
	}
	if (arrays.length === 1) {
		return arrays[0];
	}

	return arrays[0]
		.filter((section) =>
			arrays.slice(1).every((arr) => arr.some((s) => s.id === section.id)),
		)
		.map((section) => ({
			id: section.id,
			items: mergeItems(
				arrays.map((arr) => arr.find((s) => s.id === section.id)?.items ?? []),
			),
		}))
		.filter((section) => section.items.length > 0);
};

/**
 * Collects the menu sections of the current selection, before any slot narrowing.
 *
 * When a connector is selected (selectedConnectorId != null), returns the sections for
 * its type. When group objects are selected, expands the descendant concrete object
 * types; if multiple types are mixed, only the common sections are shown (AND-merge).
 */
const collectSelectionSections = (
	state: CanvasControllerState,
	objectMenuRegistry: ObjectMenuRegistry,
): ObjectMenuSection[] => {
	const { selectedIds, selectedConnectorId, objects } = state;

	// When a connector is selected, return the connector's sections instead of selectedIds
	if (selectedConnectorId !== null) {
		const connector = objects[selectedConnectorId];
		if (!connector) {
			return [];
		}
		return objectMenuRegistry.getSections(connector.type);
	}

	if (selectedIds.length === 0) {
		return [];
	}

	// Collect the concrete object types in the selection. group types expand into
	// their descendant concrete objects.
	const selectedTypes = new Set<string>();
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) {
			continue;
		}
		if (obj.type !== "group") {
			selectedTypes.add(obj.type);
		} else {
			for (const descId of collectDescendantIds(id, objects)) {
				const desc = objects[descId];
				if (desc && desc.type !== "group") {
					selectedTypes.add(desc.type);
				}
			}
		}
	}

	if (selectedTypes.size === 0) {
		return [];
	}

	// Get each type's menu sections, then AND-merge them
	const sectionArrays = [...selectedTypes].map((type) =>
		objectMenuRegistry.getSections(type),
	);

	return mergeSections(sectionArrays);
};

/**
 * Computes the menu sections to display from the current selection.
 *
 * While a text slot is selected the sections are narrowed to the text items, so the
 * menu never offers an action that the slot cannot receive. Doing it here keeps every
 * `features.text === "slots"` type covered without each definition opting in.
 */
export const getMenuSections = (
	state: CanvasControllerState,
	objectMenuRegistry: ObjectMenuRegistry,
): ObjectMenuSection[] => {
	const sections = collectSelectionSections(state, objectMenuRegistry);
	if (resolveSelectedTextSlot(state) === null) {
		return sections;
	}
	return filterTextSlotMenuSections(sections);
};

/**
 * Memoized hook wrapper around {@link getMenuSections}, recomputing only when the selection changes.
 * When `enabled` is false (menu hidden, e.g. during a drag) the computation is skipped entirely so
 * the O(selection) work does not run every frame while the result is not shown.
 */
export const useMenuSections = (
	state: CanvasControllerState,
	enabled: boolean,
): ObjectMenuSection[] => {
	const { selectedIds, selectedConnectorId, selectedTextSlot, objects } = state;
	const { objectMenu } = useCanvasRegistries();

	return useMemo(
		() => (enabled ? getMenuSections(state, objectMenu) : []),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			enabled,
			selectedIds,
			selectedConnectorId,
			selectedTextSlot,
			objects,
			objectMenu,
		],
	);
};

import { useMemo } from "react";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";
import { objectMenuRegistry } from "../ObjectMenuRegistry";
import type { MenuItem, MenuSection } from "../ObjectMenuTypes";

const itemKey = (section: MenuItem): string =>
	section.type === "custom" ? section.id : section.type;

/**
 * AND-merges the item lists of multiple object types.
 * Keeps only the items common to all types.
 * For borderStyle, radius is enabled only when every type has radius: true.
 */
const mergeItems = (arrays: MenuItem[][]): MenuItem[] => {
	if (arrays.length === 1) {
		return arrays[0];
	}

	return arrays[0]
		.filter((section) => {
			const key = itemKey(section);
			return arrays
				.slice(1)
				.every((arr) => arr.some((s) => itemKey(s) === key));
		})
		.map((section) => {
			if (section.type !== "borderStyle") {
				return section;
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
const mergeSections = (arrays: MenuSection[][]): MenuSection[] => {
	if (arrays.length === 0) {
		return [];
	}
	if (arrays.length === 1) {
		return arrays[0];
	}

	return arrays[0]
		.filter((group) =>
			arrays.slice(1).every((arr) => arr.some((g) => g.id === group.id)),
		)
		.map((group) => ({
			id: group.id,
			items: mergeItems(
				arrays.map((arr) => arr.find((g) => g.id === group.id)?.items ?? []),
			),
		}))
		.filter((group) => group.items.length > 0);
};

/**
 * Computes the menu sections to display from the current selection.
 *
 * When a connector is selected (selectedConnectorId != null), returns the groups for
 * its type. When group objects are selected, expands the descendant concrete object
 * types; if multiple types are mixed, only the common groups and sections are shown
 * (AND-merge).
 */
export const getMenuGroups = (state: CanvasControllerState): MenuSection[] => {
	const { selectedIds, selectedConnectorId, objects } = state;

	// When a connector is selected, return the connector's groups instead of selectedIds
	if (selectedConnectorId !== null) {
		const connector = objects[selectedConnectorId];
		if (!connector) {
			return [];
		}
		return objectMenuRegistry.getGroups(connector.type, connector);
	}

	if (selectedIds.length === 0) {
		return [];
	}

	// Collect the concrete object types contained in the selection.
	// group types are expanded into their descendant concrete object types.
	const types = new Set<string>();
	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) {
			continue;
		}
		if (obj.type !== "group") {
			types.add(obj.type);
		} else {
			for (const descId of collectDescendantIds(id, objects)) {
				const desc = objects[descId];
				if (desc && desc.type !== "group") {
					types.add(desc.type);
				}
			}
		}
	}

	if (types.size === 0) {
		return [];
	}

	// Get the menu groups using a representative instance of each type, then AND-merge them
	const groupArrays = [...types].map((type) => {
		const representative = Object.values(objects).find((o) => o?.type === type);
		return representative
			? objectMenuRegistry.getGroups(type, representative)
			: [];
	});

	return mergeSections(groupArrays);
};

/** Memoized hook wrapper around {@link getMenuGroups}, recomputing only when the selection changes. */
export const useMenuGroups = (state: CanvasControllerState): MenuSection[] => {
	const { selectedIds, selectedConnectorId, objects } = state;

	return useMemo(
		() => getMenuGroups(state),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedIds, selectedConnectorId, objects],
	);
};

import { useMemo } from "react";

import type { ObjectPartKindRegistry } from "../../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { useCanvasRegistries } from "../../../../registries/CanvasRegistriesContext";
import { getSelectedConnectorId } from "../../../../selection/readers/getSelectedConnectorId";
import { readPickedPartStyleIntentKinds } from "../../../../selection/readers/readPickedPartStyleIntentKinds";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";
import { mergeSectionsByKey } from "../../utils/mergeSectionsByKey";
import type { ObjectMenuRegistry } from "../ObjectMenuRegistry";
import type { ObjectMenuItem, ObjectMenuSection } from "../ObjectMenuTypes";
import { filterMenuSectionsForPickedPart } from "../utils/filterMenuSectionsForPickedPart";

const itemKey = (item: ObjectMenuItem): string =>
	item.type === "custom" ? item.id : item.type;

/**
 * Reconciles the per-type variants of one item that survived the AND-merge.
 * Only borderStyle carries an option to reconcile: the corner radius is offered
 * only when every type in the selection has one, since the property reaches the
 * others as a field they do not draw.
 */
const mergeItemVariants = (items: ObjectMenuItem[]): ObjectMenuItem => {
	const first = items[0];
	if (first.type !== "borderStyle") {
		return first;
	}
	return {
		type: "borderStyle",
		radius: items.every(
			(item) => item.type === "borderStyle" && item.radius === true,
		),
	};
};

/**
 * AND-merges the section lists of multiple object types.
 * Keeps only sections whose id is common to all types, and AND-merges the items
 * within each section as well.
 */
const mergeSections = (arrays: ObjectMenuSection[][]): ObjectMenuSection[] =>
	mergeSectionsByKey(arrays, itemKey, mergeItemVariants);

/**
 * Collects the menu sections of the current selection, before any slot narrowing.
 *
 * A selected connector returns the sections for its type. When group objects are
 * selected, expands the descendant concrete object types; if multiple types are
 * mixed, only the common sections are shown (AND-merge).
 */
const collectSelectionSections = (
	state: CanvasControllerState,
	objectMenuRegistry: ObjectMenuRegistry,
): ObjectMenuSection[] => {
	const { objectIds: selectedIds } = state.selection;
	const { objects } = state;

	const connectorId = getSelectedConnectorId(state);
	if (connectorId !== null) {
		return objectMenuRegistry.getSections(objects[connectorId].type);
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
 * While a part is picked whose kind declares what it receives (`styleIntentKinds`), the
 * sections are narrowed to the items raising only that, and every custom item not
 * naming the picked kind goes, so the menu never offers an action the part cannot
 * receive: the text items under a text slot, which every text-holding type is
 * given without opting in (filterMenuSectionsForPickedPart).
 * A pick of a kind declaring nothing (a vertex) leaves them alone, the menu still
 * acting on the object.
 *
 * An open text editor narrows them the same way, through the slot it keeps picked
 * (see `textEditState`), for the same reason read the other way round: what the menu offers there has to be something a stretch of the text
 * being edited can take, and reshaping or restacking the shape mid-edit is not it.
 *
 * @param state - The current canvas controller state
 * @param objectMenuRegistry - Per-canvas ObjectMenuRegistry, asked once per concrete type in the selection
 * @param objectPartKindRegistry - Per-canvas ObjectPartKindRegistry, asked for what the picked kind receives (readPickedPartStyleIntentKinds)
 * @returns The sections in display order
 */
export const getMenuSections = (
	state: CanvasControllerState,
	objectMenuRegistry: ObjectMenuRegistry,
	objectPartKindRegistry: ObjectPartKindRegistry,
): ObjectMenuSection[] => {
	const sections = collectSelectionSections(state, objectMenuRegistry);
	const styleIntentKinds = readPickedPartStyleIntentKinds(
		state,
		objectPartKindRegistry,
	);
	const pickedPart = state.selection.part;
	if (styleIntentKinds === null || pickedPart === null) {
		return sections;
	}
	return filterMenuSectionsForPickedPart(
		sections,
		pickedPart.kind,
		styleIntentKinds,
	);
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
	const { selection, objects } = state;
	const { objectMenu, objectPartKind } = useCanvasRegistries();

	return useMemo(
		() => (enabled ? getMenuSections(state, objectMenu, objectPartKind) : []),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[enabled, selection, objects, objectMenu, objectPartKind],
	);
};

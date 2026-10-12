import { useMemo } from "react";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { useCanvasRegistries } from "../../../../registries/CanvasRegistriesContext";
import { isTextSlotPart } from "../../../../selection/partKinds/textSlotPartKind";
import { getSelectedConnectorId } from "../../../../selection/readers/getSelectedConnectorId";
import type { ObjectStyleRegistry } from "../../../../style/tables/ObjectStyleRegistry";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";
import { getAddressedDeclaredKinds } from "../../utils/getAddressedDeclaredKinds";
import { mergeSectionsByKey } from "../../utils/mergeSectionsByKey";
import type { PropertyPanelRegistry } from "../PropertyPanelRegistry";
import { PROPERTY_PANEL_SECTIONS } from "../propertyPanelSections";
import type {
	PropertyPanelSection,
	PropertyPanelSelection,
} from "../PropertyPanelTypes";
import {
	ensurePropertyPanelItems,
	propertyPanelItemKey,
} from "../utils/appendPropertyPanelItems";
import { filterTextSlotPropertyPanelSections } from "../utils/filterTextSlotPropertyPanelSections";

/**
 * Collects the sidebar sections of the current selection, before any slot
 * narrowing.
 *
 * A selected connector returns the sections for its type. When group objects
 * are selected, expands the descendant concrete object types; if multiple types
 * are mixed, only what they all offer is shown (AND-merge, down to the
 * individual row).
 */
const collectSelectionSections = (
	state: CanvasControllerState,
	propertyPanelRegistry: PropertyPanelRegistry,
): PropertyPanelSection[] => {
	const { objectIds: selectedIds } = state.selection;
	const { objects } = state;

	const connectorId = getSelectedConnectorId(state);
	if (connectorId !== null) {
		return propertyPanelRegistry.getSections(objects[connectorId].type);
	}

	if (selectedIds.length === 0) {
		return [];
	}

	// Collect the concrete object types in the selection. group types expand into
	// their descendant concrete objects.
	const selectedTypes = new Set<string>();
	for (const id of selectedIds) {
		const selected = objects[id];
		if (!selected) {
			continue;
		}
		if (selected.type !== "group") {
			selectedTypes.add(selected.type);
		} else {
			for (const descendantId of collectDescendantIds(id, objects)) {
				const descendant = objects[descendantId];
				if (descendant && descendant.type !== "group") {
					selectedTypes.add(descendant.type);
				}
			}
		}
	}

	if (selectedTypes.size === 0) {
		return [];
	}

	return mergeSectionsByKey(
		[...selectedTypes].map((type) => propertyPanelRegistry.getSections(type)),
		propertyPanelItemKey,
	);
};

/**
 * Whether the selection holds an aspect-ratio lock of its own, rather than
 * reaching the one on each selected object: a multi-selection and a group both
 * carry `lockAspectRatio` on the box drawn around their members, so the row
 * belongs to them whatever those members are.
 */
const holdsOwnAspectRatioLock = (state: CanvasControllerState): boolean => {
	const { objectIds: selectedIds } = state.selection;
	const { objects, multiSelectGroup } = state;
	if (multiSelectGroup) {
		return true;
	}
	return selectedIds.length === 1 && objects[selectedIds[0]]?.type === "group";
};

/**
 * Drops the sections whose `isShown` turns them down for this selection, after
 * the merge and the slot narrowing: a section every row of which would draw
 * nothing (the connector's label sections while the label has no text) would
 * otherwise leave its heading standing over an empty body.
 */
const filterShownSections = (
	sections: PropertyPanelSection[],
	state: CanvasControllerState,
): PropertyPanelSection[] => {
	const selection: PropertyPanelSelection = {
		objects: state.objects,
		selection: state.selection,
	};
	return sections.filter((section) => section.isShown?.(selection) ?? true);
};

/**
 * Computes the sidebar sections to display from the current selection.
 *
 * While a text slot is selected the sections are narrowed to the text rows, plus
 * the rows whose every style kind the type declares itself in `styleEntries`, and
 * every custom row goes (filterTextSlotPropertyPanelSections), so the panel never
 * offers a control the slot cannot receive — the same narrowing the ObjectMenu
 * does, and for the same reason an open text editor narrows them too (through the
 * slot it keeps picked, see `textEditState`): what is
 * offered there has to be something a stretch of the text being edited can take,
 * and reshaping the shape mid-edit is not it.
 *
 * A multi-selection and a group are given the aspect-ratio lock whatever they
 * hold: the lock is theirs rather than their members', and the merge would drop
 * the row as soon as one selected type lacks it (a `point` shape has no size to
 * hold in proportion, so the default panel gives it none).
 *
 * @param state - The current canvas controller state; the selection and the objects it names are read
 * @param propertyPanelRegistry - Per-canvas PropertyPanelRegistry, asked once per concrete type in the selection
 * @param objectStyleRegistry - Per-canvas ObjectStyleRegistry; read only while text is addressed, for the kinds the addressed type declares
 * @returns The sections in display order; empty when nothing is selected, the selected types share nothing, or every section turned the selection down
 */
export const getPropertyPanelSections = (
	state: CanvasControllerState,
	propertyPanelRegistry: PropertyPanelRegistry,
	objectStyleRegistry: ObjectStyleRegistry,
): PropertyPanelSection[] => {
	const sections = collectSelectionSections(state, propertyPanelRegistry);
	if (!isTextSlotPart(state.selection.part)) {
		// This path alone: the box the lock governs is not a selected slot's.
		return filterShownSections(
			holdsOwnAspectRatioLock(state)
				? ensurePropertyPanelItems(sections, PROPERTY_PANEL_SECTIONS.layout, {
						type: "lockAspectRatio",
					})
				: sections,
			state,
		);
	}
	return filterShownSections(
		filterTextSlotPropertyPanelSections(
			sections,
			getAddressedDeclaredKinds(state, objectStyleRegistry),
		),
		state,
	);
};

/**
 * Memoized hook wrapper around {@link getPropertyPanelSections}, recomputing
 * only when the selection changes.
 *
 * @param state - The current canvas controller state
 * @returns The sections in display order
 */
export const usePropertyPanelSections = (
	state: CanvasControllerState,
): PropertyPanelSection[] => {
	const { selection, objects } = state;
	const { propertyPanel, objectStyle } = useCanvasRegistries();

	return useMemo(
		() => getPropertyPanelSections(state, propertyPanel, objectStyle),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selection, objects, propertyPanel, objectStyle],
	);
};

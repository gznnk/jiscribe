import { useMemo } from "react";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { useCanvasRegistries } from "../../../../registries/CanvasRegistriesContext";
import { collectDescendantIds } from "../../../../utils/collectDescendantIds";
import { resolveSelectedTextSlot } from "../../../../utils/resolveSelectedTextSlot";
import { mergeSectionsByKey } from "../../utils/mergeSectionsByKey";
import type { PropertyPanelRegistry } from "../PropertyPanelRegistry";
import type {
	PropertyPanelSection,
	PropertyPanelSelection,
} from "../PropertyPanelTypes";
import {
	ensurePropertyPanelItems,
	propertyPanelItemKey,
} from "../utils/appendPropertyPanelItems";

/** The one section whose rows a selected text slot can receive. */
const TEXT_SECTION_ID = "text";

/** The section the aspect-ratio lock belongs to, as the default panel builds it. */
const LAYOUT_SECTION = { id: "layout", label: "Layout" };

/**
 * Narrows the sections down to the rows a selected text slot can receive: the
 * text section's built-in rows. Custom rows go with the other sections, since a
 * plugin row has no way to say it is slot-aware. A section left empty is dropped
 * so no accordion header survives on its own.
 */
const filterTextSlotSections = (
	sections: PropertyPanelSection[],
): PropertyPanelSection[] =>
	sections
		.filter((section) => section.id === TEXT_SECTION_ID)
		.map((section) => ({
			...section,
			items: section.items.filter((item) => item.type !== "custom"),
		}))
		.filter((section) => section.items.length > 0);

/**
 * Collects the sidebar sections of the current selection, before any slot
 * narrowing.
 *
 * When a connector is selected (selectedConnectorId != null), returns the
 * sections for its type. When group objects are selected, expands the descendant
 * concrete object types; if multiple types are mixed, only what they all offer
 * is shown (AND-merge, down to the individual row).
 */
const collectSelectionSections = (
	state: CanvasControllerState,
	propertyPanelRegistry: PropertyPanelRegistry,
): PropertyPanelSection[] => {
	const { selectedIds, selectedConnectorId, objects } = state;

	if (selectedConnectorId !== null) {
		const connector = objects[selectedConnectorId];
		if (!connector) {
			return [];
		}
		return propertyPanelRegistry.getSections(connector.type);
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
 * belongs to them whatever those members are. The same test builds the
 * ObjectMenu's aspect-ratio section (buildSystemSections).
 */
const holdsOwnAspectRatioLock = (state: CanvasControllerState): boolean => {
	const { selectedIds, objects, multiSelectGroup } = state;
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
		selectedIds: state.selectedIds,
		selectedConnectorId: state.selectedConnectorId,
	};
	return sections.filter((section) => section.isShown?.(selection) ?? true);
};

/**
 * Computes the sidebar sections to display from the current selection.
 *
 * While a text slot is selected the sections are narrowed to the text one and
 * its custom rows go with them (filterTextSlotSections), so the panel never
 * offers a control the slot cannot receive — the same narrowing the ObjectMenu
 * does, and for the same reason an open text editor narrows them too: what is
 * offered there has to be something a stretch of the text being edited can take,
 * and reshaping the shape mid-edit is not it.
 *
 * A multi-selection and a group are given the aspect-ratio lock whatever they
 * hold: the lock is theirs rather than their members', and the merge would drop
 * the row as soon as one selected type lacks it (a `point` shape has no size to
 * hold in proportion, so the default panel gives it none).
 *
 * @param state - The current canvas controller state; the selection, the objects it names and the text focus are read
 * @param propertyPanelRegistry - Per-canvas PropertyPanelRegistry, asked once per concrete type in the selection
 * @returns The sections in display order; empty when nothing is selected, the selected types share nothing, or every section turned the selection down
 */
export const getPropertyPanelSections = (
	state: CanvasControllerState,
	propertyPanelRegistry: PropertyPanelRegistry,
): PropertyPanelSection[] => {
	const sections = collectSelectionSections(state, propertyPanelRegistry);
	if (
		resolveSelectedTextSlot(state) === null &&
		state.textEditState?.kind !== "shape"
	) {
		// This path alone: the branch below hands a selected slot the text section
		// and nothing else, and the box the lock governs is not the slot's.
		return filterShownSections(
			holdsOwnAspectRatioLock(state)
				? ensurePropertyPanelItems(sections, LAYOUT_SECTION, {
						type: "lockAspectRatio",
					})
				: sections,
			state,
		);
	}
	return filterShownSections(filterTextSlotSections(sections), state);
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
	const { selectedIds, selectedConnectorId, selectedTextSlot, objects } = state;
	// The editing session itself is not read, only whether one is open on a shape:
	// the section set is narrowed while it is (getPropertyPanelSections).
	const isEditingShapeText = state.textEditState?.kind === "shape";
	const { propertyPanel } = useCanvasRegistries();

	return useMemo(
		() => getPropertyPanelSections(state, propertyPanel),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			selectedIds,
			selectedConnectorId,
			selectedTextSlot,
			isEditingShapeText,
			objects,
			propertyPanel,
		],
	);
};

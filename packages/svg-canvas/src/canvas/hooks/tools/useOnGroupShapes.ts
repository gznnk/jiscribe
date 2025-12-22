import { useEffect, useRef } from "react";

import { EVENT_NAME_GROUP_SHAPES } from "../../../constants/core/EventNames";
import type { GroupShapesEvent } from "../../../types/events/GroupShapesEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { calcUnrotatedItemableBoundingBox } from "../../../utils/core/calcUnrotatedItemableBoundingBox";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import { hasRotateDisabledItem } from "../../../utils/shapes/group/hasRotateDisabledItem";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { addDiagramToParentOrRoot } from "../../utils/addDiagramToParentOrRoot";
import { bringConnectLinesForward } from "../../utils/bringConnectLinesForward";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { findParentCanvasContainingAllDiagrams } from "../../utils/findParentCanvasContainingAllDiagrams";
import { removeDiagramsById } from "../../utils/removeDiagramsById";
import { removeItemsFromDiagram } from "../../utils/removeItemsFromDiagram";
import { updateOutlineOfAllItemables } from "../../utils/updateOutlineOfAllItemables";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Hook that monitors GroupShapes events and performs shape grouping.
 */
export const useOnGroupShapes = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	useEffect(() => {
		// Bypass references to avoid function creation in every render.
		const { eventBus } = refBus.current.props;

		const groupShapesListener = (e: Event) => {
			// Bypass references to avoid function creation in every render.
			const { props, addHistory } = refBus.current;
			const { setCanvasState } = props;

			const event = (e as CustomEvent<GroupShapesEvent>).detail;

			setCanvasState((prevState) => {
				// Find diagrams by IDs
				const targetDiagrams = event.shapeIds
					.map((id) => getDiagramById(prevState.items, id))
					.filter((diagram): diagram is Diagram => diagram !== null);

				if (targetDiagrams.length < 2) {
					console.error("Not enough valid shapes found for grouping.");
					return prevState;
				}
				const targetDiagramIds = targetDiagrams.map((d) => d.id);

				// Calculate bounding box for the group
				const boundingBox = calcUnrotatedItemableBoundingBox(targetDiagrams);

				// Check if any target diagram has rotation disabled
				const groupRotateEnabled = !hasRotateDisabledItem(targetDiagrams);

				// Create a new group data.
				const group: GroupState = {
					id: event.groupId,
					type: "Group",
					name: event.name,
					description: event.description,
					x: boundingBox.left + (boundingBox.right - boundingBox.left) / 2,
					y: boundingBox.top + (boundingBox.bottom - boundingBox.top) / 2,
					width: boundingBox.right - boundingBox.left,
					height: boundingBox.bottom - boundingBox.top,
					rotation: 0,
					scaleX: 1,
					scaleY: 1,
					keepProportion: true,
					rotateEnabled: groupRotateEnabled,
					inversionEnabled: true,
					itemableType: "group",
					isSelected: false,
					isRootSelected: false,
					isAncestorSelected: false,
					showOutline: false,
					outlineDisabled: false,
					isTransforming: false,
					items: targetDiagrams,
				};

				// Find parent canvas that contains all target diagrams
				let parentCanvas = findParentCanvasContainingAllDiagrams(
					prevState.items,
					targetDiagrams,
				);
				// If found, remove selected diagrams from it
				if (parentCanvas) {
					parentCanvas = removeItemsFromDiagram(parentCanvas, targetDiagramIds);
				}

				// Remove target diagrams from items recursively
				const remainingItems = removeDiagramsById(
					prevState.items,
					event.shapeIds,
				);

				// Add group to parent canvas or root level
				const mergedItems = addDiagramToParentOrRoot(
					remainingItems,
					group,
					parentCanvas,
				);

				// Clean up empty groups
				const groupsCleanedUpItems = cleanupGroups(mergedItems);

				// Bring connect lines forward that are connected to grouped components.
				const orderedItems = bringConnectLinesForward(
					groupsCleanedUpItems,
					targetDiagrams,
				);

				const outlineUpdatedItems = updateOutlineOfAllItemables(orderedItems);

				// Create next state
				let nextState = {
					...prevState,
					items: outlineUpdatedItems,
					multiSelectGroup: undefined,
				} as SvgCanvasState;

				// Add history
				nextState = addHistory(event.eventId, nextState);

				return nextState;
			});
		};

		eventBus.addEventListener(EVENT_NAME_GROUP_SHAPES, groupShapesListener);

		return () => {
			eventBus.removeEventListener(
				EVENT_NAME_GROUP_SHAPES,
				groupShapesListener,
			);
		};
	}, []);
};

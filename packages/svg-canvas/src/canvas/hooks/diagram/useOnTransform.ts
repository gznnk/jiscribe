import { useCallback, useRef } from "react";

import { DiagramRegistry } from "../../../registry";
import type { DiagramTransformEvent } from "../../../types/events/DiagramTransformEvent";
import type { EventPhase } from "../../../types/events/EventPhase";
import type { Diagram } from "../../../types/state/core/Diagram";
import { calcUnrotatedItemableBoundingBox } from "../../../utils/core/calcUnrotatedItemableBoundingBox";
import { getSelectedDiagrams } from "../../../utils/core/getSelectedDiagrams";
import { calculateEffectiveDimensions } from "../../../utils/math/geometry/calculateEffectiveDimensions";
import { refreshConnectLines } from "../../../utils/shapes/connectLine/refreshConnectLines";
import { isConnectableState } from "../../../utils/validation/isConnectableState";
import { isItemableState } from "../../../utils/validation/isItemableState";
import { isTransformativeState } from "../../../utils/validation/isTransformativeState";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { calculateTransformedCenter } from "../../utils/calculateTransformedCenter";
import { calculateTransformedRotation } from "../../utils/calculateTransformedRotation";
import { createItemMap } from "../../utils/createItemMap";
import { updateDiagramConnectPoints } from "../../utils/updateDiagramConnectPoints";
import { updateOutlineOfItemable } from "../../utils/updateOutlineOfItemable";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Determines if an item should be in transforming state based on event type.
 * Pure function for consistent state management.
 */
const getIsTransformingState = (eventPhase: EventPhase): boolean => {
	return eventPhase === "Started" || eventPhase === "InProgress";
};

/**
 * Custom hook to handle transform events on the canvas.
 */
export const useOnTransform = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Reference to store the canvas state at the start of transform for connect line updates.
	const startCanvasState = useRef<SvgCanvasState | undefined>(undefined);
	// Reference to store selected item IDs at the start of transform for performance.
	const multiSelectedItemIds = useRef<Set<string>>(new Set());
	// Reference to store initial items at the start of transform.
	const initialItemsMap = useRef<Map<string, Diagram>>(new Map());

	const transformChild = useCallback(
		(
			item: Diagram,
			event: DiagramTransformEvent,
			transformedConnectables: Diagram[],
			ancestors: string[] = [],
			topLevelGroupIds: Set<string> = new Set(),
		): Diagram => {
			const initialItem = initialItemsMap.current.get(item.id);
			if (!initialItem) {
				// If the item is not found in the initial items map, return the child item as is.
				return item;
			}

			// Calculate the transformed center position of the item
			const newCenter = calculateTransformedCenter(
				initialItem.x,
				initialItem.y,
				event.startFrame,
				event.endFrame,
			);

			let newItem: Diagram;
			if (isTransformativeState(initialItem)) {
				const groupScaleX = event.endFrame.width / event.startFrame.width;
				const groupScaleY = event.endFrame.height / event.startFrame.height;

				const newWidth = initialItem.width * groupScaleX;
				const newHeight = initialItem.height * groupScaleY;

				// Apply minWidth and minHeight constraints
				const { effectiveWidth, effectiveHeight } =
					calculateEffectiveDimensions(
						newWidth,
						newHeight,
						initialItem.minWidth,
						initialItem.minHeight,
					);

				const newRotation = calculateTransformedRotation(
					initialItem,
					event.startFrame.rotation,
					event.endFrame.rotation,
				);

				// Handle inversion if enabled
				const effectiveScaleX = initialItem.inversionEnabled
					? event.endFrame.scaleX
					: Math.abs(event.endFrame.scaleX);
				const effectiveScaleY = initialItem.inversionEnabled
					? event.endFrame.scaleY
					: Math.abs(event.endFrame.scaleY);

				const newItemFrame = {
					x: newCenter.x,
					y: newCenter.y,
					width: effectiveWidth,
					height: effectiveHeight,
					rotation: newRotation,
					scaleX: effectiveScaleX,
					scaleY: effectiveScaleY,
				};

				let newItems: Diagram[] | undefined;
				if (isItemableState(initialItem)) {
					const transformFunction = DiagramRegistry.getTransformItemsFunction(
						item.type,
					);
					if (transformFunction) {
						newItems = transformFunction(newItemFrame, initialItem.items);
						newItems = newItems.map((child) => {
							if (isConnectableState(child)) {
								const updatedChild = updateDiagramConnectPoints(child);
								transformedConnectables.push(updatedChild);
								return updatedChild;
							}
							return child;
						});
					} else {
						newItems = transformRecursively(
							initialItem.items ?? [],
							event,
							transformedConnectables,
							true,
							[...ancestors, item.id],
							topLevelGroupIds,
						);
					}
				}

				newItem = {
					...item,
					...newItemFrame,
					isTransforming: getIsTransformingState(event.eventPhase),
					items: newItems,
				} as Diagram;

				// Update the connect points of the transformed item.
				newItem = updateDiagramConnectPoints(newItem);

				// If the item is connectable, add it to the transformed diagrams.
				if (isConnectableState(newItem)) {
					transformedConnectables.push(newItem);
				}
			} else {
				newItem = {
					...item,
					x: newCenter.x,
					y: newCenter.y,
				};

				// Update the connect points of the transformed item.
				updateDiagramConnectPoints(newItem);
				if (isConnectableState(newItem)) {
					transformedConnectables.push(newItem);
				}
			}

			return newItem;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const transformRecursively = useCallback(
		(
			items: Diagram[],
			event: DiagramTransformEvent,
			transformedConnectables: Diagram[],
			isTransformedChild: boolean,
			ancestors: string[] = [],
			topLevelGroupIds: Set<string> = new Set(),
		): Diagram[] => {
			return items.map((item) => {
				if (item.id === event.id) {
					// Apply the new shape to the item.
					let newItem = {
						...item,
						...event.endFrame,
					} as Diagram;

					// Update isTransforming flag if it's transformative data
					if (isTransformativeState(newItem)) {
						newItem.isTransforming = getIsTransformingState(event.eventPhase);
					}

					// Transform its children recursively.
					if (isItemableState(newItem)) {
						const transformFunction = DiagramRegistry.getTransformItemsFunction(
							item.type,
						);
						if (transformFunction) {
							newItem.items = transformFunction(event.endFrame, newItem.items);
							newItem.items = newItem.items.map((child) => {
								if (isConnectableState(child)) {
									const updatedChild = updateDiagramConnectPoints(child);
									transformedConnectables.push(updatedChild);
									return updatedChild;
								}
								return child;
							});
						} else {
							newItem.items = transformRecursively(
								newItem.items ?? [],
								event,
								transformedConnectables,
								true,
								[...ancestors, item.id],
								topLevelGroupIds,
							);
						}
					}

					// Update the connect points of the transformed item.
					newItem = updateDiagramConnectPoints(newItem);
					if (isConnectableState(newItem)) {
						transformedConnectables.push(newItem);
					}

					// Add top-level group to the set if this is a transformed item and we have ancestors
					if (ancestors.length > 0 && ancestors[0]) {
						topLevelGroupIds.add(ancestors[0]);
					}

					return newItem;
				}
				// If the item is multi-selected or a child of a transformed item, transform it.
				if (isTransformedChild || multiSelectedItemIds.current.has(item.id)) {
					const transformedChild = transformChild(
						item,
						event,
						transformedConnectables,
						ancestors,
						topLevelGroupIds,
					);

					// Add top-level group to the set if this is a transformed item and we have ancestors
					if (ancestors.length > 0 && ancestors[0]) {
						topLevelGroupIds.add(ancestors[0]);
					}

					return transformedChild;
				}
				// If the item has children, recursively transform them.
				if (isItemableState(item)) {
					return {
						...item,
						items: transformRecursively(
							item.items ?? [],
							event,
							transformedConnectables,
							false,
							[...ancestors, item.id],
							topLevelGroupIds,
						),
					};
				}
				return item; // Return the child item unchanged if not selected.
			});
		},
		[transformChild],
	);

	// Return a callback function to handle the transform event.
	return useCallback(
		(e: DiagramTransformEvent) => {
			// Bypass references to avoid function creation in every render.
			const {
				props: { setCanvasState, onPanZoomChange },
			} = refBus.current;
			const { addHistory } = refBus.current;

			// Update the canvas state based on the transform event.
			setCanvasState((prevState) => {
				// Store the canvas state and initial child items at the start of transform
				if (e.eventPhase === "Started") {
					// Store the current canvas state for connect line updates
					startCanvasState.current = prevState;

					// Store selected item IDs for performance
					const selectedItems = getSelectedDiagrams(prevState.items);
					if (selectedItems.length > 1) {
						// If multiple items are selected, store their IDs for multi-selection.
						multiSelectedItemIds.current = new Set(
							selectedItems.map((item) => item.id),
						);
					}
					// Store initial items
					initialItemsMap.current = createItemMap(prevState.items);
				}

				// Transformed diagrams to be updated.
				const transformedConnectables: Diagram[] = [];
				const topLevelGroupIds = new Set<string>();

				let newState = {
					...prevState,
					items: transformRecursively(
						prevState.items,
						e,
						transformedConnectables,
						false,
						[],
						topLevelGroupIds,
					),
					interactionState: getIsTransformingState(e.eventPhase)
						? InteractionState.Transforming
						: InteractionState.Idle,
				} as SvgCanvasState;

				// If the event has minX and minY, update the canvas state
				if (e.minX !== undefined && e.minY !== undefined) {
					newState.minX = e.minX;
					newState.minY = e.minY;

					onPanZoomChange?.({
						minX: e.minX,
						minY: e.minY,
						zoom: newState.zoom,
					});
				}

				// Refresh the connect lines for the transformed diagrams.
				newState = refreshConnectLines(
					transformedConnectables,
					newState,
					startCanvasState.current,
				);

				// Update outline of top-level groups that contain transformed diagrams
				newState.items = newState.items.map((item) => {
					if (topLevelGroupIds.has(item.id)) {
						return updateOutlineOfItemable(item);
					}
					return item;
				});

				// Update multi select group outline
				if (prevState.multiSelectGroup) {
					const selectedItems = getSelectedDiagrams(newState.items);
					const boundingBox = calcUnrotatedItemableBoundingBox(
						selectedItems,
						e.endFrame.x,
						e.endFrame.y,
						e.endFrame.rotation,
					);
					newState.multiSelectGroup = {
						...prevState.multiSelectGroup,
						x: boundingBox.left + (boundingBox.right - boundingBox.left) / 2,
						y: boundingBox.top + (boundingBox.bottom - boundingBox.top) / 2,
						width: boundingBox.right - boundingBox.left,
						height: boundingBox.bottom - boundingBox.top,
						scaleX: e.endFrame.scaleX,
						scaleY: e.endFrame.scaleY,
						rotation: e.endFrame.rotation,
					};
				}

				if (e.eventPhase === "Ended") {
					// Add history and get updated state
					newState = addHistory(e.eventId, newState);

					// Clean up the stored items at the end of transform
					startCanvasState.current = undefined;
					initialItemsMap.current.clear();
					multiSelectedItemIds.current.clear();
				}

				return newState;
			});
		},
		[transformRecursively],
	);
};

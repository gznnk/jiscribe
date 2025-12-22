import { useCallback, useRef } from "react";

import { useClearAllSelection } from "./useClearAllSelection";
import type { HandleEdgeScrollArgs } from "../../../hooks/useAutoEdgeScroll";
import { useAutoEdgeScroll } from "../../../hooks/useAutoEdgeScroll";
import type { Box } from "../../../types/core/Box";
import type { AreaSelectionEvent } from "../../../types/events/AreaSelectionEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { getSelectedDiagrams } from "../../../utils/core/getSelectedDiagrams";
import { calcDiagramBoundingBox } from "../../../utils/math/geometry/calcDiagramBoundingBox";
import { isItemableState } from "../../../utils/validation/isItemableState";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";
import { createMultiSelectGroup } from "../../utils/createMultiSelectGroup";
import { createSelectedDiagramPathIndex } from "../../utils/createSelectedDiagramPathIndex";
import { updateOutlineBySelection } from "../../utils/updateOutlineBySelection";
import { updateRootSelectedState } from "../../utils/updateRootSelectedState";

/**
 * Update items array with outline display based on selection bounds
 */
const updateItemsWithOutline = (
	items: Diagram[],
	selectionBounds: {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	},
	cachedBoundingBoxes?: Map<string, Box>,
) => {
	// Calculate selection bounds in canvas coordinates
	const minX = Math.min(selectionBounds.startX, selectionBounds.endX);
	const maxX = Math.max(selectionBounds.startX, selectionBounds.endX);
	const minY = Math.min(selectionBounds.startY, selectionBounds.endY);
	const maxY = Math.max(selectionBounds.startY, selectionBounds.endY);

	return applyFunctionRecursively(items, (item, ancestors) => {
		if (!isSelectableState(item)) return item;
		if (item.type === "ConnectLine") return item;
		if (
			ancestors.some(
				(ancestor) =>
					isItemableState(ancestor) && ancestor.itemableType === "composite",
			)
		) {
			return item;
		}

		// Use cached bounding box if available, otherwise calculate
		const itemBounds =
			cachedBoundingBoxes?.get(item.id) ?? calcDiagramBoundingBox(item);

		// Check if item's bounding box is completely contained within selection rectangle
		const isInSelection =
			itemBounds.left >= minX &&
			itemBounds.right <= maxX &&
			itemBounds.top >= minY &&
			itemBounds.bottom <= maxY;

		return {
			...item,
			showOutline: isInSelection,
		};
	});
};

/**
 * Convert client coordinates to SVG canvas coordinates using matrixTransform
 */
const clientToCanvasCoords = (
	clientX: number,
	clientY: number,
	svgElement: SVGSVGElement | null,
) => {
	if (!svgElement) {
		return { x: 0, y: 0 };
	}

	const svgPoint = svgElement.createSVGPoint();
	svgPoint.x = clientX;
	svgPoint.y = clientY;

	const screenCTM = svgElement.getScreenCTM();
	if (screenCTM) {
		// Inverse transform to convert from client coordinates to SVG coordinates
		const svgCoords = svgPoint.matrixTransform(screenCTM.inverse());
		return { x: svgCoords.x, y: svgCoords.y };
	}

	return { x: 0, y: 0 };
};

/**
 * Custom hook to handle area selection on the canvas.
 */
export const useAreaSelection = (props: SvgCanvasSubHooksProps) => {
	const { canvasState, canvasRef } = props;

	// Get the clear all selection function
	const onClearAllSelection = useClearAllSelection(props);

	// Client position reference for edge scrolling
	const clientPosRef = useRef<{ x: number; y: number } | null>(null);

	// Reference to store cached bounding boxes for area selection
	const cachedBoundingBoxesRef = useRef<Map<string, Box>>(new Map());

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Updates the selection state of items after area selection.
	 * This function applies selection logic, group selection, and transform controls according to the current outline state.
	 *
	 * - Sets isSelected for items with showOutline
	 * - Handles group selection and deselects children when a group is selected
	 * - Creates a multiSelectGroup if multiple items are selected
	 * - Shows transform controls for single selection
	 * - Updates outline display for selected items and their ancestors
	 * - Removes transform controls from non-transformative items
	 */
	const updateItemsSelection = useCallback(() => {
		const {
			props: { setCanvasState },
		} = refBus.current;

		setCanvasState((prevState) => {
			/**
			 * Step 1: Set isSelected for items with showOutline
			 * Only items with showOutline are marked as selected
			 */
			let items = applyFunctionRecursively(prevState.items, (item) => {
				if (!isSelectableState(item)) {
					return item;
				}
				// Mark item as selected if showOutline is true
				if (item.showOutline) {
					return {
						...item,
						isSelected: true,
					};
				}
				return item;
			});

			/**
			 * Step 2: Handle group selection logic
			 * If all children of a group are selected, select the group and deselect its children
			 */
			const processGroupSelectionLogic = (items: Diagram[]): Diagram[] => {
				const processItem = (item: Diagram): Diagram => {
					// Recursively process nested items (bottom-up)
					if (isItemableState(item)) {
						const updatedItems = item.items.map(processItem);
						// Select group if all children are selected
						if (
							updatedItems.length > 0 &&
							updatedItems.every(
								(child) => isSelectableState(child) && child.isSelected,
							)
						) {
							// Deselect children when group is selected
							const deselectedItems = updatedItems.map((child) => {
								if (isSelectableState(child)) {
									return {
										...child,
										isSelected: false,
									};
								}
								return child;
							});
							return {
								...item,
								items: deselectedItems,
								isSelected: true,
								showOutline: true,
							} as Diagram;
						}
						// Return group with updated children
						return {
							...item,
							items: updatedItems,
						} as Diagram;
					}
					return item;
				};
				return items.map(processItem);
			};
			items = processGroupSelectionLogic(items);

			/**
			 * Step 3: Multi-selection logic
			 * If multiple items are selected, create a multiSelectGroup
			 * If only one item is selected, show transform controls for it
			 */
			const selectedItems = getSelectedDiagrams(items);
			let multiSelectGroup: GroupState | undefined = undefined;
			if (selectedItems.length > 1) {
				// Create multiSelectGroup for multiple selection
				multiSelectGroup = createMultiSelectGroup(
					selectedItems,
					prevState.multiSelectGroup?.keepProportion,
				);
			} else {
				// Show transform controls for single selected item
				items = applyFunctionRecursively(items, (item) => {
					if (!isSelectableState(item)) {
						return item;
					}
					if (item.isSelected) {
						return item;
					}
					return item;
				});
			}

			/**
			 * Step 4: Update outline display for selected items and their ancestors (shared utility)
			 */
			items = updateOutlineBySelection(items);

			/**
			 * Step 5: Update isRootSelected state for all selected items
			 */
			items = updateRootSelectedState(items);

			/**
			 * Step 6: Create path index for selected diagrams for efficient access
			 */
			const selectedDiagramPathIndex = createSelectedDiagramPathIndex(items);

			return {
				...prevState,
				items,
				multiSelectGroup,
				selectedDiagramPathIndex,
			};
		});
	}, []);

	/**
	 * Handle edge scrolling with custom logic for area selection
	 */
	const handleEdgeScroll = useCallback((state: HandleEdgeScrollArgs) => {
		const {
			setCanvasState,
			canvasState: { areaSelectionState },
		} = refBus.current.props;

		const newSelectionBounds = {
			startX: areaSelectionState.startX,
			startY: areaSelectionState.startY,
			endX: state.cursorPos.x,
			endY: state.cursorPos.y,
		};

		// Update canvas state with new scroll position and selection
		setCanvasState((prevState) => ({
			...prevState,
			minX: state.minX,
			minY: state.minY,
			areaSelectionState: newSelectionBounds,
			items: updateItemsWithOutline(
				prevState.items,
				newSelectionBounds,
				cachedBoundingBoxesRef.current,
			),
		}));
	}, []);

	// Use the shared auto edge scroll hook
	const { autoEdgeScroll, clearEdgeScroll } = useAutoEdgeScroll(
		{
			zoom: canvasState.zoom,
			minX: canvasState.minX,
			minY: canvasState.minY,
			containerWidth:
				canvasRef?.containerRef?.current?.getBoundingClientRect()?.width ?? 0,
			containerHeight:
				canvasRef?.containerRef?.current?.getBoundingClientRect()?.height ?? 0,
		},
		handleEdgeScroll,
	);

	/**
	 * Handle area selection events
	 */
	const onAreaSelection = useCallback(
		(event: AreaSelectionEvent) => {
			const { canvasState, setCanvasState } = refBus.current.props;
			const { eventPhase, clientX, clientY } = event;

			switch (eventPhase) {
				case "Started": {
					const { canvasRef } = refBus.current.props;
					const { x, y } = clientToCanvasCoords(
						clientX,
						clientY,
						canvasRef?.svgRef.current || null,
					);

					// Clear existing selections when starting area selection
					onClearAllSelection();

					// Pre-calculate and cache bounding boxes for all selectable items
					const { items } = canvasState;
					cachedBoundingBoxesRef.current.clear();

					applyFunctionRecursively(items, (item) => {
						if (isSelectableState(item) && item.type !== "ConnectLine") {
							const boundingBox = calcDiagramBoundingBox(item);
							cachedBoundingBoxesRef.current.set(item.id, boundingBox);
						}
						return item;
					});

					// Set interaction state to AreaSelection and initialize selection state
					setCanvasState((prevState) => ({
						...prevState,
						interactionState: InteractionState.AreaSelection,
						areaSelectionState: {
							startX: x,
							startY: y,
							endX: x,
							endY: y,
						},
					}));
					break;
				}

				case "InProgress": {
					// If area selection is not active, do nothing
					if (canvasState.interactionState !== InteractionState.AreaSelection) {
						return;
					}

					const { canvasRef } = refBus.current.props;
					const { x, y } = clientToCanvasCoords(
						clientX,
						clientY,
						canvasRef?.svgRef.current || null,
					);
					const { areaSelectionState } = canvasState;

					const newSelectionState = {
						startX: areaSelectionState.startX,
						startY: areaSelectionState.startY,
						endX: x,
						endY: y,
					};

					// Update client position reference
					clientPosRef.current = { x: clientX, y: clientY };

					// Use the shared auto edge scroll functionality
					if (autoEdgeScroll({ x, y })) {
						break;
					}

					// Update canvas state with new selection bounds
					setCanvasState((prevState) => ({
						...prevState,
						items: updateItemsWithOutline(
							prevState.items,
							newSelectionState,
							cachedBoundingBoxesRef.current,
						),
						areaSelectionState: newSelectionState,
					}));
					break;
				}

				case "Ended": {
					// If area selection is not active, do nothing
					if (canvasState.interactionState !== InteractionState.AreaSelection) {
						return;
					}

					// Clear edge scroll when area selection ends
					clearEdgeScroll();

					// Clear cached bounding boxes
					cachedBoundingBoxesRef.current.clear();

					// Update items selection based on current showOutline state
					updateItemsSelection();

					// Update interaction state to Idle and reset selection state
					setCanvasState((prevState) => ({
						...prevState,
						interactionState: InteractionState.Idle,
						areaSelectionState: {
							startX: 0,
							startY: 0,
							endX: 0,
							endY: 0,
						},
					}));
					break;
				}
			}
		},
		[
			onClearAllSelection,
			updateItemsSelection,
			clearEdgeScroll,
			autoEdgeScroll,
		],
	);

	const onCancelAreaSelection = useCallback(() => {
		// Clear edge scroll when area selection is cancelled
		clearEdgeScroll();

		// Clear cached bounding boxes
		cachedBoundingBoxesRef.current.clear();

		// Reset interaction state and remove outlines
		const { setCanvasState } = refBus.current.props;
		setCanvasState((prevState) => ({
			...prevState,
			items: applyFunctionRecursively(prevState.items, (item) => {
				if (!isSelectableState(item)) return item;
				return {
					...item,
					showOutline: false,
				};
			}),
			interactionState: InteractionState.Idle,
			areaSelectionState: {
				startX: 0,
				startY: 0,
				endX: 0,
				endY: 0,
			},
		}));
	}, [clearEdgeScroll]);

	return {
		selectionState: props.canvasState.areaSelectionState,
		onAreaSelection,
		onCancelAreaSelection,
	};
};

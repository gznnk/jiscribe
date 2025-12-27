import React, {
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

import { MULTI_SELECT_GROUP } from "./SvgCanvasConstants";
import { initializeSvgCanvasDiagrams } from "./SvgCanvasRegistry";
import {
	Container,
	HTMLElementsContainer,
	SelectionRect,
	Svg,
	Viewport,
	ViewportOverlay,
} from "./SvgCanvasStyled";
import { InteractionState } from "./types/InteractionState";
import type { SvgCanvasProps } from "./types/SvgCanvasProps";
import type { SvgCanvasRef } from "./types/SvgCanvasRef";
import type { SvgCanvasState } from "./types/SvgCanvasState";
import {
	getNextZoomLevel,
	getPreviousZoomLevel,
	getResetZoomLevel,
} from "./utils/zoomLevels";
import { AiChatPanel } from "../components/auxiliary/AiChatPanel";
import { DiagramInfoPopover } from "../components/auxiliary/DiagramInfoPopover";
import { DragGhost } from "../components/auxiliary/DragGhost";
import { FlashConnectLine } from "../components/auxiliary/FlashConnectLine";
import { GlobalDefs } from "../components/auxiliary/GlobalDefs";
import { GridBackground } from "../components/auxiliary/GridBackground";
import { GridPattern } from "../components/auxiliary/GridPattern";
import { MiniMap } from "../components/auxiliary/MiniMap";
import { PointerCaptureElement } from "../components/auxiliary/PointerCaptureElement";
import { PreviewConnectLine } from "../components/auxiliary/PreviewConnectLine";
import {
	BottomPanelContainer,
	RightPanelContainer,
} from "../components/auxiliary/RightPanelContainer";
import { ZoomControls } from "../components/auxiliary/ZoomControls";
import { TextEditor } from "../components/core/Textable";
import { CanvasMenu } from "../components/menus/CanvasMenu";
import { ContextMenu, useContextMenu } from "../components/menus/ContextMenu";
import { DiagramMenu } from "../components/menus/DiagramMenu";
import UserMenu from "../components/menus/UserMenu/UserMenu";
import { Group } from "../components/shapes/Group";
import { EventBusProvider } from "../context/EventBusContext";
import { SvgCanvasStateProvider } from "../context/SvgCanvasStateContext";
import { SvgViewportProvider } from "../context/SvgViewportContext";
import { DiagramRegistry } from "../registry";
import type { SvgViewport } from "../types/core/SvgViewport";
import { getSelectedDiagrams } from "../utils/core/getSelectedDiagrams";
import { newEventId } from "../utils/core/newEventId";
import { useConnectLineControl } from "./hooks/control/useConnectLineControl";
import { useOutline } from "./hooks/control/useOutline";
import { usePathControl } from "./hooks/control/usePathControl";
import { usePositionLabel } from "./hooks/control/usePositionLabel";
import { useTransformControl } from "./hooks/control/useTransformControl";
import { useShortcutKey } from "./hooks/keyboard/useShortcutKey";
import { drawPoint } from "../utils/debug/drawPoint";

// TODO: 実行する場所を考える
// Initialize all diagram types when this module is loaded
initializeSvgCanvasDiagrams();

/**
 * SvgCanvas component
 */
const SvgCanvasComponent = forwardRef<SvgCanvasRef, SvgCanvasProps>(
	(props, ref) => {
		// In the SvgCanvas render function,
		// we handle DOM events related to the SvgCanvas elements.
		const {
			eventBus,
			title,
			minX,
			minY,
			items,
			zoom,
			multiSelectGroup,
			textEditorState,
			previewConnectLineState,
			grabScrollState,
			selectionState,
			interactionState,
			suppressContextMenu,
			showDragGhost,
			selectedDiagramPathIndex,
			// actions
			onClick,
			onConnect,
			onCopy,
			onDelete,
			onDiagramChange,
			onDrag,
			onDragOver,
			onDragLeave,
			onExecute,
			onHoverChange,
			onAddDiagramByType,
			onPaste,
			onPreviewConnectLine,
			onTextChange,
			// history
			onRedo,
			onUndo,
			// navigation
			onGrabStart,
			onGrabMove,
			onGrabEnd,
			onNavigate,
			onZoom,
			// selection
			onAreaSelection,
			onCancelAreaSelection,
			onClearAllSelection,
			onSelect,
			onSelectAll,
			// context menu
			onSuppressContextMenuChange,
		} = props;

		// Reference to the SVG element container
		const containerRef = useRef<HTMLDivElement>(null);
		// Reference to the SVG element
		const svgRef = useRef<SVGSVGElement>(null);
		// Forward refs to parent using useImperativeHandle
		useImperativeHandle(ref, () => ({
			containerRef,
			svgRef,
		}));

		// Container dimensions state
		const [containerWidth, setContainerWidth] = useState(0);
		const [containerHeight, setContainerHeight] = useState(0);

		// Reference of the SVG viewport
		const viewportRef = useRef<SvgViewport>({
			minX,
			minY,
			containerWidth,
			containerHeight,
			zoom,
		});
		viewportRef.current = {
			minX,
			minY,
			containerWidth,
			containerHeight,
			zoom,
		};

		// Reference of the SVG canvas state
		const canvasStateRef = useRef<SvgCanvasState>({
			id: props.id || "",
			minX,
			minY,
			zoom,
			items,
			multiSelectGroup,
			history: props.history || [],
			historyIndex: props.historyIndex || 0,
			lastHistoryEventId: props.lastHistoryEventId || "",
			textEditorState,
			previewConnectLineState,
			grabScrollState,
			interactionState,
			suppressContextMenu,
			showDragGhost,
			selectedDiagramPathIndex,
			areaSelectionState: selectionState || {
				startX: 0,
				startY: 0,
				endX: 0,
				endY: 0,
			},
		});
		canvasStateRef.current = {
			id: props.id || "",
			minX,
			minY,
			zoom,
			items,
			multiSelectGroup,
			history: props.history || [],
			historyIndex: props.historyIndex || 0,
			lastHistoryEventId: props.lastHistoryEventId || "",
			textEditorState,
			previewConnectLineState,
			grabScrollState,
			interactionState,
			suppressContextMenu,
			showDragGhost,
			selectedDiagramPathIndex,
			areaSelectionState: selectionState || {
				startX: 0,
				startY: 0,
				endX: 0,
				endY: 0,
			},
		};

		// Flag indicating whether the SVG element has focus
		const hasFocus = useRef(false);

		// Use the context menu hook to handle context menu events.
		const {
			contextMenuProps,
			contextMenuHandlers: { onContextMenu },
			contextMenuFunctions,
		} = useContextMenu(props, containerRef);

		// DiagramMenu is now self-contained and doesn't need a hook

		// Use the shortcut key hook to handle keyboard shortcuts
		useShortcutKey({
			zoom,
			hasFocus,
			textEditorState,
			onDelete,
			onSelectAll,
			onClearAllSelection,
			onUndo,
			onRedo,
			onCopy,
			onPaste,
			onZoom,
		});

		// Create references bypass to avoid function creation in every render.
		const refBusVal = {
			minX,
			minY,
			zoom,
			hasFocus,
			textEditorState,
			onDrag,
			onDragOver,
			onDragLeave,
			onDiagramChange,
			onClearAllSelection,
			onHoverChange,
			onZoom,
			onGrabStart,
			onGrabMove,
			onGrabEnd,
			onSuppressContextMenuChange,
			contextMenuFunctions,
		};
		const refBus = useRef(refBusVal);
		refBus.current = refBusVal;

		/**
		 * Focus event handler for SVG element
		 */
		const handleFocus = useCallback(() => {
			hasFocus.current = true;
		}, []);

		/**
		 * Blur event handler for SVG element
		 */
		const handleBlur = useCallback(() => {
			hasFocus.current = false;
		}, []);

		/**
		 * Handle the pointer down event on the SVG canvas.
		 */
		const handlePointerDown = useCallback(
			(e: React.PointerEvent<SVGSVGElement>) => {
				// Bypass references to avoid function creation in every render.
				const {
					onClearAllSelection,
					onGrabStart,
					onSuppressContextMenuChange,
					contextMenuFunctions,
				} = refBus.current;

				// Reset suppressContextMenu flag to allow context menu on next right-click
				onSuppressContextMenuChange?.(false);

				if (e.target === e.currentTarget) {
					// Start area selection if left mouse button is pressed
					if (e.button === 0 && onAreaSelection) {
						// Use dummy element for pointer capture to enable auto-scroll when pointer is outside viewport
						if (dummyElementRef.current) {
							dummyElementRef.current.setPointerCapture(e.pointerId);
							capturedPointerIdRef.current = e.pointerId;
						}

						onAreaSelection({
							eventId: newEventId(),
							eventPhase: "Started",
							clientX: e.clientX,
							clientY: e.clientY,
						});
					}

					// Clear the selection when pointer is down on the canvas.
					onClearAllSelection?.();
				}

				// Handle grab start for right mouse button
				if (e.button === 2) {
					onGrabStart?.(e);
				}

				// Close the context menu.
				contextMenuFunctions.closeContextMenu();
			},
			[onAreaSelection],
		);

		/**
		 * Handle the pointer move event for grab scrolling.
		 * Area selection is handled by PointerCaptureElement when pointer capture is active.
		 */
		const handlePointerMove = useCallback(
			(e: React.PointerEvent<SVGSVGElement>) => {
				// Call the grab move handler
				refBus.current.onGrabMove?.(e);
			},
			[],
		);

		/**
		 * Handle the pointer up event to end grab scrolling.
		 * Area selection end is handled by PointerCaptureElement when pointer capture is active.
		 */
		const handlePointerUp = useCallback(
			(e: React.PointerEvent<SVGSVGElement>) => {
				refBus.current.onGrabEnd?.(e);
			},
			[],
		);

		/**
		 * SvgCanvas key down event handler
		 */
		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<SVGSVGElement>) => {
				// Cancel area selection on Escape key
				if (
					e.key === "Escape" &&
					interactionState === InteractionState.AreaSelection
				) {
					e.preventDefault();
					// Release pointer capture from dummy element
					if (
						dummyElementRef.current &&
						capturedPointerIdRef.current !== null
					) {
						try {
							dummyElementRef.current.releasePointerCapture(
								capturedPointerIdRef.current,
							);
							capturedPointerIdRef.current = null;
						} catch {
							// Ignore errors if pointer capture wasn't set
						}
					}
					if (onCancelAreaSelection) {
						onCancelAreaSelection();
					}
					return;
				}

				// Cancel event if canvas doesn't have focus to disable scrolling
				if (e.target !== e.currentTarget) {
					e.preventDefault();
				}
			},
			[interactionState, onCancelAreaSelection],
		);

		// Monitor container size changes with ResizeObserver
		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			const resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const { width, height } = entry.contentRect;
					setContainerWidth(width);
					setContainerHeight(height);
				}
			});

			resizeObserver.observe(container);

			// Initialize with current dimensions
			const rect = container.getBoundingClientRect();
			setContainerWidth(rect.width);
			setContainerHeight(rect.height);

			return () => {
				resizeObserver.disconnect();
			};
		}, []);

		useEffect(() => {
			// Handle all wheel events for canvas zoom at document level
			const onDocumentWheel = (e: WheelEvent) => {
				e.preventDefault();

				const delta = e.deltaY > 0 ? 0.9 : 1.1;
				const newZoom = refBus.current.zoom * delta;
				// Pass cursor position for cursor-centered zoom
				refBus.current.onZoom?.(newZoom, {
					clientX: e.clientX,
					clientY: e.clientY,
				});
			};

			document.addEventListener("wheel", onDocumentWheel, {
				passive: false,
				capture: true,
			});

			return () => {
				document.removeEventListener("wheel", onDocumentWheel, true);
			};
		}, []);

		// Create a dummy element for pointer capture during area selection
		const dummyElementRef = useRef<HTMLDivElement>(null);
		const capturedPointerIdRef = useRef<number | null>(null);

		/**
		 * Handle pointer move events from the capture element
		 */
		const handleCaptureElementPointerMove = useCallback(
			(e: React.PointerEvent<HTMLDivElement>) => {
				// Forward pointer move events to area selection when captured
				if (
					interactionState === InteractionState.AreaSelection &&
					onAreaSelection
				) {
					onAreaSelection({
						eventId: newEventId(),
						eventPhase: "InProgress",
						clientX: e.clientX,
						clientY: e.clientY,
					});
				}
			},
			[interactionState, onAreaSelection],
		);

		/**
		 * Handle pointer up events from the capture element
		 */
		const handleCaptureElementPointerUp = useCallback(
			(e: React.PointerEvent<HTMLDivElement>) => {
				// Forward pointer up events to area selection when captured
				if (
					interactionState === InteractionState.AreaSelection &&
					onAreaSelection
				) {
					// Release pointer capture from dummy element
					if (
						dummyElementRef.current &&
						capturedPointerIdRef.current !== null
					) {
						dummyElementRef.current.releasePointerCapture(
							capturedPointerIdRef.current,
						);
						capturedPointerIdRef.current = null;
					}

					onAreaSelection({
						eventId: newEventId(),
						eventPhase: "Ended",
						clientX: e.clientX,
						clientY: e.clientY,
					});
				}
			},
			[interactionState, onAreaSelection],
		);

		// Zoom control handlers
		const handleZoomIn = useCallback(() => {
			const nextLevel = getNextZoomLevel(zoom);
			onZoom?.(nextLevel);
		}, [onZoom, zoom]);

		const handleZoomOut = useCallback(() => {
			const prevLevel = getPreviousZoomLevel(zoom);
			onZoom?.(prevLevel);
		}, [onZoom, zoom]);

		const handleZoomReset = useCallback(() => {
			const resetLevel = getResetZoomLevel();
			onZoom?.(resetLevel);
		}, [onZoom]);

		// Render diagrams
		const renderedItems = items.map((item) => {
			const component = DiagramRegistry.getComponent(item.type);
			if (!component) {
				console.warn(`Component not found for type: ${item.type}`);
				return null;
			}
			const props = {
				...item,
				key: item.id,
				onDiagramChange,
				onDrag,
				onDragOver,
				onDragLeave,
				onClick,
				onSelect,
				onConnect,
				onPreviewConnectLine,
				onTextChange,
				onExecute,
				onHoverChange,
			};

			return React.createElement(component, props);
		});

		// Render TransformControl using custom hook
		const renderedTransformative = useTransformControl(props);

		// Render PathControl using custom hook
		const renderedPathControl = usePathControl(props);

		// Render ConnectLineControl using custom hook
		const renderedConnectLineControl = useConnectLineControl(props);

		// Collect outlines and render them using custom hook
		const renderedOutlines = useOutline(props);

		// Render PositionLabel using custom hook
		const renderedPositionLabel = usePositionLabel(props);

		// Debug: draw origin point
		drawPoint("origin", { x: 0, y: 0 }, "red");
		console.log("Canvas Items:", items);

		return (
			<EventBusProvider eventBus={eventBus}>
				<SvgCanvasStateProvider canvasStateRef={canvasStateRef}>
					<SvgViewportProvider viewportRef={viewportRef}>
						<Viewport>
							<Container ref={containerRef}>
								<Svg
									width={containerWidth}
									height={containerHeight}
									viewBox={`${minX / zoom} ${minY / zoom} ${containerWidth / zoom} ${containerHeight / zoom}`}
									tabIndex={0}
									ref={svgRef}
									isGrabbing={grabScrollState?.isGrabbing}
									onPointerDown={handlePointerDown}
									onPointerMove={handlePointerMove}
									onPointerUp={handlePointerUp}
									onKeyDown={handleKeyDown}
									onFocus={handleFocus}
									onBlur={handleBlur}
									onContextMenu={onContextMenu}
								>
									<title>{title}</title>
									<GlobalDefs />
									{/* Grid pattern definition */}
									<GridPattern zoom={zoom} baseGridSize={25} color="#f3f4f6" />
									{/* Grid background */}
									<GridBackground
										x={minX / zoom}
										y={minY / zoom}
										width={containerWidth / zoom}
										height={containerHeight / zoom}
									/>
									{/* Render the items in the SvgCanvas. */}
									{renderedItems}
									{/* Dummy group for multi-select. */}
									{multiSelectGroup && (
										<Group {...multiSelectGroup} id={MULTI_SELECT_GROUP} />
									)}
									{/* Render Transformative controls for selected item or multiSelectGroup */}
									{renderedTransformative}
									{/* Render PathControl for selected Path item */}
									{renderedPathControl}
									{/* Render ConnectLineControl for selected ConnectLine item */}
									{renderedConnectLineControl}
									{/* Render outlines for all diagrams with showOutline=true */}
									{renderedOutlines}
									{/* Render PositionLabel for dragging items */}
									{renderedPositionLabel}
									{/* Render preview connect line. */}
									<PreviewConnectLine pathData={previewConnectLineState} />
									{/* Render flash connect lines */}
									<FlashConnectLine />
									{/* Render drag ghost for items dragged outside viewBox */}
									{showDragGhost && (
										<DragGhost diagrams={getSelectedDiagrams(items)} />
									)}
									{/* Render area selection rectangle */}
									{selectionState && (
										<SelectionRect
											x={Math.min(selectionState.startX, selectionState.endX)}
											y={Math.min(selectionState.startY, selectionState.endY)}
											width={Math.abs(
												selectionState.endX - selectionState.startX,
											)}
											height={Math.abs(
												selectionState.endY - selectionState.startY,
											)}
											visible={
												interactionState === InteractionState.AreaSelection
											}
										/>
									)}
								</Svg>
								{/* Container for HTML elements that follow the scroll of the SVG canvas with zoom scaling. */}
								<HTMLElementsContainer left={-minX} top={-minY} zoom={zoom}>
									<TextEditor
										{...textEditorState}
										onTextChange={onTextChange}
									/>
								</HTMLElementsContainer>
								{/* Container for HTML elements that follow the scroll but not zoom. */}
								<HTMLElementsContainer left={-minX} top={-minY}>
									<DiagramMenu
										canvasProps={props}
										containerWidth={containerWidth}
										containerHeight={containerHeight}
									/>
									{/* Diagram info popover for selected diagram name/description */}
									<DiagramInfoPopover
										canvasProps={props}
										containerWidth={containerWidth}
										containerHeight={containerHeight}
									/>
								</HTMLElementsContainer>
							</Container>
							{/* Container for HTML elements fixed to the viewport. */}
							<ViewportOverlay>
								<CanvasMenu onAddDiagramByType={onAddDiagramByType} />
								<UserMenu />
								<ContextMenu {...contextMenuProps} />
								<RightPanelContainer>
									<MiniMap
										items={items}
										minX={minX}
										minY={minY}
										containerWidth={containerWidth}
										containerHeight={containerHeight}
										zoom={zoom}
										onNavigate={onNavigate}
									/>
								</RightPanelContainer>
								<BottomPanelContainer>
									<AiChatPanel />
									<ZoomControls
										zoom={zoom}
										onZoomIn={handleZoomIn}
										onZoomOut={handleZoomOut}
										onZoomReset={handleZoomReset}
									/>
								</BottomPanelContainer>
								{/* Pointer capture element for area selection */}
								<PointerCaptureElement
									elementRef={dummyElementRef}
									capturedPointerId={capturedPointerIdRef.current}
									onPointerMove={handleCaptureElementPointerMove}
									onPointerUp={handleCaptureElementPointerUp}
								/>
							</ViewportOverlay>
						</Viewport>
					</SvgViewportProvider>
				</SvgCanvasStateProvider>
			</EventBusProvider>
		);
	},
);
SvgCanvasComponent.displayName = "SvgCanvas";

export const SvgCanvas = memo(SvgCanvasComponent);

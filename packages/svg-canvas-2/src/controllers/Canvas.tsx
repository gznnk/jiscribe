import type { Dimensions } from "@workspace/geometry";
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";

import {
	Container,
	ScrollSyncedOverlay,
	Viewport,
	ViewportOverlay,
	ZoomScaledOverlay,
} from "./CanvasStyled";
import type { GestureCallback } from "./gestures/recognizer/GestureRecognizerTypes";
import { useContainerSize } from "./hooks/useContainerSize";
import { useDocumentWheel } from "./hooks/useDocumentWheel";
import { useGestureRecognizer } from "./hooks/useGestureRecognizer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { canvasReducer } from "./reducer/canvasReducer";
import { initializeRegistries } from "./setup";
import { TransformControlsLayer } from "./ui/controls/TransformControlsLayer";
import { DebugInfo } from "./ui/debug/DebugInfo";
import { AreaSelectionRect } from "./ui/feedback/AreaSelectionRect";
import { DragGhost } from "./ui/feedback/DragGhost";
import { SelectionOverlay } from "./ui/feedback/SelectionOverlay";
import { ContextMenu } from "./ui/menu/ContextMenu";
import { ShapeLibrary } from "./ui/menu/ShapeLibrary";
import { canvasToDoc, canvasToState } from "../operations/canvas/CanvasMapper";
import { CanvasView } from "../presentations/CanvasView";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { CanvasState } from "../states/canvas/CanvasState";

// Initialize all registries (ObjectRegistry, GestureHandlerRegistry)
initializeRegistries();

type CanvasProps = {
	canvasDoc: CanvasDoc;
	/**
	 * Callback invoked when a committable action occurs (e.g., dragEnd, click).
	 * Use this to persist or sync the canvas state to external storage.
	 */
	onCommit?: (doc: CanvasDoc) => void;
};

const CanvasComponent: React.FC<CanvasProps> = ({ canvasDoc, onCommit }) => {
	const canvasRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const initialState = useMemo((): CanvasState => {
		const baseState = canvasToState(canvasDoc);
		return {
			...baseState,
			selectedIds: [],
			hoveredIds: [],
			eventStartState: null,
			lastCommitTime: 0,
			contextMenuPosition: null,
			pendingShapeType: null,
			ghostPosition: null,
			areaSelection: null,
		};
	}, [canvasDoc]);

	// Reducer for canvas state management
	const [state, dispatch] = useReducer(canvasReducer, initialState);

	// console.log("[Canvas] Render", { state });

	// Notify parent component when a committable action occurs
	useEffect(() => {
		if (state.lastCommitTime > 0) {
			const doc = canvasToDoc(state);
			onCommit?.(doc);
		}
	}, [state, onCommit]);

	// Sync external canvasDoc changes
	useEffect(() => {
		const newState = canvasToState(canvasDoc);
		dispatch({ type: "SYNC_EXTERNAL", payload: newState });
	}, [canvasDoc]);

	// Gesture handling
	const handleGesture = useCallback<GestureCallback>(
		(gesture) => {
			dispatch({ type: "GESTURE", gesture });
		},
		[dispatch],
	);
	const { pointerHandlers, wheelHandler } = useGestureRecognizer({
		gestureCallback: handleGesture,
		containerRef: canvasRef,
		svgRef,
		canvasState: state,
	});

	// Use wheel handler from GestureRecognizer
	useDocumentWheel(svgRef, wheelHandler);

	// Container resize handling
	const handleResize = useCallback(
		(dimensions: Dimensions) => {
			dispatch({ type: "CONTAINER_RESIZE", dimensions });
		},
		[dispatch],
	);
	useContainerSize(canvasRef, handleResize);

	// Keyboard shortcuts handling
	useKeyboardShortcuts(state, dispatch);

	// Context menu handling
	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
		},
		[],
	);

	const { minX, minY, zoom } = state.viewport;

	return (
		<Viewport
			data-id="canvas"
			data-kind="canvas"
			ref={canvasRef}
			onContextMenu={handleContextMenu}
			{...pointerHandlers}
		>
			<Container>
				<CanvasView
					objects={state.objects}
					rootIds={state.rootIds}
					connectorIds={state.connectorIds}
					viewport={state.viewport}
					svgRef={svgRef}
				>
					<SelectionOverlay
						selectedIds={state.selectedIds}
						objects={state.objects}
					/>
					<TransformControlsLayer
						selectedIds={state.selectedIds}
						objects={state.objects}
						zoom={state.viewport.zoom}
					/>
					<DragGhost
						pendingShapeType={state.pendingShapeType}
						ghostPosition={state.ghostPosition}
					/>
					<AreaSelectionRect areaSelection={state.areaSelection} />
				</CanvasView>
				{/* Container for HTML elements that follow canvas scroll AND zoom */}
				<ZoomScaledOverlay left={-minX} top={-minY} zoom={zoom}>
					{/* TODO: Add zoom-scaled elements (e.g., text editors on objects) */}
				</ZoomScaledOverlay>
				{/* Container for HTML elements that follow canvas scroll but NOT zoom */}
				<ScrollSyncedOverlay left={-minX} top={-minY}>
					{/* TODO: Add scroll-synced elements (e.g., object menus, popovers) */}
				</ScrollSyncedOverlay>
			</Container>
			<ViewportOverlay>
				<ShapeLibrary />
				<DebugInfo selectedIds={state.selectedIds} objects={state.objects} />
				<ContextMenu position={state.contextMenuPosition} canvasState={state} />
			</ViewportOverlay>
		</Viewport>
	);
};
export const Canvas = memo(CanvasComponent);

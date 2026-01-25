import type { Dimensions } from "@workspace/geometry";
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";

import { Container } from "./CanvasStyled";
import { useContainerSize } from "./hooks/useContainerSize";
import {
	useGestureRecognizer,
	type GestureCallback,
} from "./hooks/useGestureRecognizer";
import { canvasReducer } from "./reducer/canvasReducer";
import { initializeRegistries } from "./setup";
import {
	canvasToDoc,
	canvasToState,
} from "../operations/canvas/CanvasMapper";
import { CanvasView } from "../presentations/canvas/CanvasView";
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
		};
	}, [canvasDoc]);

	// Reducer for canvas state management
	const [state, dispatch] = useReducer(canvasReducer, initialState);

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
	const eventHandlers = useGestureRecognizer({
		gestureCallback: handleGesture,
		containerRef: canvasRef,
		svgRef,
		viewport: state.viewport,
	});

	// Container resize handling
	const handleResize = useCallback(
		(dimensions: Dimensions) => {
			dispatch({ type: "CONTAINER_RESIZE", dimensions });
		},
		[dispatch],
	);
	useContainerSize(canvasRef, handleResize);

	// Context menu handling
	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
			dispatch({
				type: "CONTEXT_MENU",
				payload: { clientX: e.clientX, clientY: e.clientY },
			});
		},
		[dispatch],
	);

	return (
		<Container
			data-id="canvas"
			data-kind="canvas"
			ref={canvasRef}
			onContextMenu={handleContextMenu}
			{...eventHandlers}
		>
			<CanvasView {...state} svgRef={svgRef} />
		</Container>
	);
};
export const Canvas = memo(CanvasComponent);

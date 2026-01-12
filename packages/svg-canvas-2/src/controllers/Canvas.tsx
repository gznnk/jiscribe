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
import { canvasToState } from "../operations/canvas/CanvasMapper";
import { CanvasView } from "../presentations/canvas/CanvasView";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { CanvasState } from "../states/canvas/CanvasState";

type CanvasProps = {
	canvasDoc: CanvasDoc;
};

const CanvasComponent: React.FC<CanvasProps> = ({ canvasDoc }) => {
	const canvasRef = useRef<HTMLDivElement>(null);

	const initialState = useMemo((): CanvasState => {
		const baseState = canvasToState(canvasDoc);
		return {
			...baseState,
			selectedIds: [],
			dragging: null,
		};
	}, [canvasDoc]);

	const [state, dispatch] = useReducer(canvasReducer, initialState);

	// 外部からのcanvasDoc更新を検知して同期
	useEffect(() => {
		const newState = canvasToState(canvasDoc);
		dispatch({ type: "SYNC_EXTERNAL", payload: newState });
	}, [canvasDoc]);

	// Bypass gesture events to reducer
	const handleGesture = useCallback<GestureCallback>(
		(gesture) => {
			dispatch({ type: "GESTURE", gesture });
		},
		[dispatch],
	);

	const eventHandlers = useGestureRecognizer({
		gestureCallback: handleGesture,
		targetRef: canvasRef,
	});

	const handleResize = useCallback(
		(dimensions: Dimensions) => {
			dispatch({ type: "CONTAINER_RESIZE", dimensions });
		},
		[dispatch],
	);

	useContainerSize(canvasRef, handleResize);

	return (
		<Container
			data-id="container"
			data-kind="container"
			ref={canvasRef}
			{...eventHandlers}
		>
			<CanvasView {...state} />
		</Container>
	);
};
export const Canvas = memo(CanvasComponent);

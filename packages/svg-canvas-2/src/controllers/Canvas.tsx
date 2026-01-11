import { memo, useCallback, useMemo, useReducer } from "react";

import { canvasReducer } from "./canvasReducer";
import {
	useGestureRecognizer,
	type GestureCallback,
} from "./useGestureRecognizer";
import { canvasToState } from "../operations/canvas/CanvasMapper";
import { CanvasView } from "../presentations/canvas/CanvasView";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { CanvasState } from "../states/canvas/CanvasState";

type CanvasProps = {
	canvasDoc: CanvasDoc;
};

const CanvasComponent: React.FC<CanvasProps> = ({ canvasDoc }) => {
	const initialState = useMemo((): CanvasState => {
		const baseState = canvasToState(canvasDoc);
		return {
			...baseState,
			selectedIds: [],
			dragging: null,
		};
	}, [canvasDoc]);

	const [state, dispatch] = useReducer(canvasReducer, initialState);

	const handleGesture = useCallback<GestureCallback>(
		(gesture) => {
			dispatch({ type: "GESTURE", gesture });
		},
		[dispatch],
	);

	const eventHandlers = useGestureRecognizer(handleGesture);

	return (
		<div data-kind="canvas" {...eventHandlers}>
			<CanvasView {...state} />
		</div>
	);
};
export const Canvas = memo(CanvasComponent);

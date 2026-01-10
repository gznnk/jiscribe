import { memo, useCallback, useMemo } from "react";

import {
	useGestureRecognizer,
	type Gesture,
} from "./useGestureRecognizer";
import { canvasToState } from "../operations/canvas/CanvasMapper";
import { ObjectsRenderer } from "../presentations/canvas/ObjectsRenderer";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

type CanvasProps = {
	canvasDoc: CanvasDoc;
};

const CanvasComponent: React.FC<CanvasProps> = ({ canvasDoc }) => {
	const canvasState = useMemo(() => {
		return canvasToState(canvasDoc);
	}, [canvasDoc]);

	const handleGesture = useCallback((gesture: Gesture) => {
		console.log("Gesture:", gesture);
	}, []);

	const eventHandlers = useGestureRecognizer(handleGesture);

	return (
		<div {...eventHandlers}>
			<ObjectsRenderer {...canvasState} />
		</div>
	);
};
export const Canvas = memo(CanvasComponent);

import { memo, useMemo } from "react";

import { useGestureHandler, type GestureStrategy } from "./useGestureHandler";
import { useGestureRecognizer } from "./useGestureRecognizer";
import { canvasToState } from "../operations/canvas/CanvasMapper";
import { ObjectsRenderer } from "../presentations/canvas/ObjectsRenderer";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

type CanvasProps = {
	canvasDoc: CanvasDoc;
};

const strategy: GestureStrategy = {
	canvas: {
		onClick: () => {
			console.log("Canvas clicked (deselect)");
		},
		onDragStart: () => {
			console.log("Canvas drag start (pan or marquee)");
		},
		onDrag: (gesture) => {
			console.log("Canvas drag:", gesture.delta);
		},
		onDragEnd: () => {
			console.log("Canvas drag end");
		},
	},
	object: {
		onClick: (gesture) => {
			const el = (gesture.target as Element)?.closest("[data-id]");
			const id = el?.getAttribute("data-id");
			console.log("Object clicked:", id);
		},
		onDragStart: (gesture) => {
			const el = (gesture.target as Element)?.closest("[data-id]");
			const id = el?.getAttribute("data-id");
			console.log("Object drag start:", id);
		},
		onDrag: (gesture) => {
			console.log("Object drag:", gesture.delta);
		},
		onDragEnd: (gesture) => {
			console.log("Object drag end:", gesture.delta);
		},
	},
};

const CanvasComponent: React.FC<CanvasProps> = ({ canvasDoc }) => {
	const canvasState = useMemo(() => {
		return canvasToState(canvasDoc);
	}, [canvasDoc]);

	const handleGesture = useGestureHandler(strategy);
	const eventHandlers = useGestureRecognizer(handleGesture);

	return (
		<div data-kind="canvas" {...eventHandlers}>
			<ObjectsRenderer {...canvasState} />
		</div>
	);
};
export const Canvas = memo(CanvasComponent);

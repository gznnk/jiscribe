import { memo, useMemo } from "react";

import { useObjectsEventHandler } from "./useObjectsEventHandler";
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

	const eventHandlers = useObjectsEventHandler();

	return (
		<div {...eventHandlers}>
			<ObjectsRenderer {...canvasState} />
		</div>
	);
};
export const Canvas = memo(CanvasComponent);

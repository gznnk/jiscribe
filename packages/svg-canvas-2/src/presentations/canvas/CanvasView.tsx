import { memo } from "react";

import type { CanvasState } from "../../states/canvas/CanvasState";
import { ObjectsRenderer } from "../layers/content/ObjectsRenderer";
import { SelectionOverlay } from "../layers/feedback/SelectionOverlay";

type CanvasViewProps = CanvasState;

const CanvasViewComponent: React.FC<CanvasViewProps> = ({
	objects,
	rootIds,
	selectedIds,
	viewport,
}) => {
	return (
		<svg
			width={viewport.width}
			height={viewport.height}
			viewBox={`${viewport.minX / viewport.zoom} ${viewport.minY / viewport.zoom} ${viewport.width / viewport.zoom} ${viewport.height / viewport.zoom}`}
			style={{ backgroundColor: "#fff" }}
		>
			<ObjectsRenderer objects={objects} rootIds={rootIds} />
			<SelectionOverlay selectedIds={selectedIds} objects={objects} />
		</svg>
	);
};

export const CanvasView = memo(CanvasViewComponent);

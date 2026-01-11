import { memo } from "react";

import type { CanvasState } from "../../states/canvas/CanvasState";
import { ObjectsRenderer } from "../layers/content/ObjectsRenderer";
import { SelectionOverlay } from "../layers/feedback/SelectionOverlay";

type CanvasViewProps = CanvasState;

const CanvasViewComponent: React.FC<CanvasViewProps> = ({
	objects,
	rootIds,
	selectedIds,
}) => {
	return (
		<svg width={1000} height={1000} style={{ backgroundColor: "#fff" }}>
			<ObjectsRenderer objects={objects} rootIds={rootIds} />
			<SelectionOverlay selectedIds={selectedIds} objects={objects} />
		</svg>
	);
};

export const CanvasView = memo(CanvasViewComponent);

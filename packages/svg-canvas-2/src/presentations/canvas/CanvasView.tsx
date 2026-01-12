import { memo } from "react";

import { Svg } from "./CanvasViewStyled";
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
	const { minX, minY, width, height, zoom } = viewport;

	return (
		<Svg
			width={width}
			height={height}
			viewBox={`${minX / zoom} ${minY / zoom} ${width / zoom} ${height / zoom}`}
		>
			<ObjectsRenderer objects={objects} rootIds={rootIds} />
			<SelectionOverlay selectedIds={selectedIds} objects={objects} />
		</Svg>
	);
};

export const CanvasView = memo(CanvasViewComponent);

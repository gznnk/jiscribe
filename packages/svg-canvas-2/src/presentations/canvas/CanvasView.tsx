import { memo } from "react";

import { Svg } from "./CanvasViewStyled";
import type { CanvasState } from "../../states/canvas/CanvasState";
import { GridBackground } from "../layers/background/GridBackground";
import { GridPattern } from "../layers/background/GridPattern";
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
			{/* Grid pattern definition */}
			<GridPattern zoom={zoom} baseGridSize={25} color="#f3f4f6" />
			{/* Grid background */}
			<GridBackground
				x={minX / zoom}
				y={minY / zoom}
				width={width / zoom}
				height={height / zoom}
			/>
			<ObjectsRenderer objects={objects} rootIds={rootIds} />
			<SelectionOverlay selectedIds={selectedIds} objects={objects} />
		</Svg>
	);
};

export const CanvasView = memo(CanvasViewComponent);

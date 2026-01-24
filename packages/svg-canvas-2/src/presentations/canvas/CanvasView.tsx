import { memo } from "react";

import { Svg } from "./CanvasViewStyled";
import { TransformControlsLayer } from "../../controllers/ui/controls/TransformControlsLayer";
import { SelectionOverlay } from "../../controllers/ui/feedback/SelectionOverlay";
import type { CanvasState } from "../../states/canvas/CanvasState";
import { GridBackground } from "../layers/background/GridBackground";
import { GridPattern } from "../layers/background/GridPattern";
import { ObjectsRenderer } from "../layers/content/ObjectsRenderer";
import { DebugInfo } from "../layers/debug/DebugInfo";

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
			<TransformControlsLayer selectedIds={selectedIds} objects={objects} />

			{/* Debug: Origin marker */}
			<g data-layer="debug-origin">
				<circle cx={0} cy={0} r={5} fill="red" />
				<line x1={-20} y1={0} x2={20} y2={0} stroke="red" strokeWidth={1} />
				<line x1={0} y1={-20} x2={0} y2={20} stroke="red" strokeWidth={1} />
			</g>

			{/* Debug: Selected object info */}
			<DebugInfo
				selectedIds={selectedIds}
				objects={objects}
				viewportWidth={width}
				viewportMinX={minX}
				viewportMinY={minY}
				zoom={zoom}
			/>
		</Svg>
	);
};

export const CanvasView = memo(CanvasViewComponent);

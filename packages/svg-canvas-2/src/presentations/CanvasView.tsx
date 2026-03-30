import { memo } from "react";
import type React from "react";

import { Svg } from "./CanvasViewStyled";
import type { CanvasState } from "../states/canvas/CanvasState";
import { GridBackground } from "./layers/background/GridBackground";
import { GridPattern } from "./layers/background/GridPattern";
import { ConnectorsRenderer } from "./layers/content/ConnectorsRenderer";
import { ObjectsRenderer } from "./layers/content/ObjectsRenderer";

type CanvasViewProps = {
	svgRef: React.RefObject<SVGSVGElement | null>;
	children?: React.ReactNode;
} & Pick<CanvasState, "objects" | "rootIds" | "connectorIds" | "viewport">;

const CanvasViewComponent: React.FC<CanvasViewProps> = ({
	objects,
	rootIds,
	connectorIds,
	viewport,
	svgRef,
	children,
}) => {
	const { minX, minY, width, height, zoom } = viewport;

	return (
		<Svg
			ref={svgRef}
			width={width}
			height={height}
			viewBox={`${minX} ${minY} ${width / zoom} ${height / zoom}`}
		>
			{/* Grid pattern definition */}
			<GridPattern zoom={zoom} baseGridSize={25} color="#f3f4f6" />
			{/* Grid background */}
			<GridBackground
				x={minX}
				y={minY}
				width={width / zoom}
				height={height / zoom}
			/>
			{/* Connectors rendered below objects */}
			<ConnectorsRenderer objects={objects} connectorIds={connectorIds} />
			<ObjectsRenderer objects={objects} rootIds={rootIds} />
			{/* Overlay layers injected from parent */}
			{children}
		</Svg>
	);
};

export const CanvasView = memo(CanvasViewComponent);

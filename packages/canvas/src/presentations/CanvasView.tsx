import { memo } from "react";
import type React from "react";

import { ContentGroup, Svg } from "./CanvasViewStyled";
import { theme } from "../constants/theme";
import { CanvasDefs } from "./defs/CanvasDefs";
import type { CanvasState } from "../states/canvas/CanvasState";
import { GridBackground } from "./layers/background/GridBackground";
import { GridPattern } from "./layers/background/GridPattern";
import { ObjectsRenderer } from "./layers/content/ObjectsRenderer";

type CanvasViewProps = {
	svgRef: React.RefObject<SVGSVGElement | null>;
	children?: React.ReactNode;
	textEditObjectId?: string | null;
	isDrawMode?: boolean;
} & Pick<CanvasState, "objects" | "rootIds" | "viewport">;

const CanvasViewComponent: React.FC<CanvasViewProps> = ({
	objects,
	rootIds,
	viewport,
	svgRef,
	children,
	textEditObjectId,
	isDrawMode = false,
}) => {
	const { minX, minY, width, height, zoom } = viewport;

	return (
		<Svg
			ref={svgRef}
			width={width}
			height={height}
			viewBox={`${minX} ${minY} ${width / zoom} ${height / zoom}`}
		>
			<CanvasDefs />
			{/* Grid pattern definition */}
			<GridPattern zoom={zoom} baseGridSize={25} color={theme.gridLine} />
			{/* Grid background */}
			<GridBackground
				x={minX}
				y={minY}
				width={width / zoom}
				height={height / zoom}
			/>
			<ContentGroup isDrawMode={isDrawMode}>
				{/* rootIds(z-order 順) を走査し、オブジェクトとコネクターを混在描画する */}
				<ObjectsRenderer
					objects={objects}
					rootIds={rootIds}
					textEditObjectId={textEditObjectId}
				/>
				{/* Overlay layers injected from parent */}
				{children}
			</ContentGroup>
		</Svg>
	);
};

export const CanvasView = memo(CanvasViewComponent);

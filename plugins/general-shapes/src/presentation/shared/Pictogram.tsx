import type { FrameShapeProps } from "@jiscribe/canvas-sdk";
import type { ReactNode } from "react";

import type { PictogramFigure } from "./PictogramFigure";
import {
	PictogramBodyPath,
	PictogramDetailPath,
	PictogramHitPath,
} from "./PictogramStyled";

type PictogramProps = {
	/** The paths to draw, already laid out in the shape's local coordinates. */
	figure: PictogramFigure;
	/** Shared frame attributes from createFrameObject (ids, transform, resolved colors). */
	shape: FrameShapeProps;
	/** Extra elements drawn behind the figure; a below-label shape puts its label hit area here. */
	children?: ReactNode;
};

/**
 * Draws a pictogram as one object group: the invisible hit paths underneath, then
 * the body silhouettes, then the detail lines over them. The group is the single
 * `data-kind="object"` element the DOM contract requires, so its parts carry none
 * themselves.
 */
export const Pictogram: React.FC<PictogramProps> = ({
	figure,
	shape,
	children,
}) => (
	<g
		data-kind={shape["data-kind"]}
		data-id={shape["data-id"]}
		transform={shape.transform}
	>
		{children}
		{figure.hit?.map((d, index) => (
			<PictogramHitPath key={index} d={d} />
		))}
		{figure.body.map((d, index) => (
			<PictogramBodyPath
				key={index}
				d={d}
				fillRule={figure.fillRule}
				strokeColor={shape.strokeColor}
				fillColor={shape.fillColor}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
		))}
		{figure.detail?.map((d, index) => (
			<PictogramDetailPath
				key={index}
				d={d}
				strokeColor={shape.strokeColor}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
		))}
	</g>
);

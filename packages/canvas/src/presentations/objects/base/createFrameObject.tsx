import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";
import type React from "react";
import type { ReactNode } from "react";

import { TextOverlay } from "./TextOverlay";
import type { TextEditable } from "./TextOverlay";
import type { FillStyleState } from "../../../states/objects/base/FillStyleState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StrokeStyleState } from "../../../states/objects/base/StrokeStyleState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import { calcTextRegion } from "../utils/calcTextRegion";
import { createSvgTransform } from "../utils/createSvgTransform";
import { getStrokeDasharray } from "../utils/getStrokeDasharray";
import { resolveAutoColor } from "../utils/resolveAutoColor";

/**
 * Attributes passed in common to the SVG element of Frame-based shapes (rect / polygon / ellipse …).
 * `draw` spreads these onto the styled element and only adds the geometry attributes.
 */
export type FrameShapeProps = {
	"data-kind": "object";
	"data-id": string;
	transform: string;
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
	strokeWidth?: number;
	strokeDasharray?: string;
};

/** The minimal state shape that createFrameObject reads (geometry + transform + the various styles). */
type FrameRenderState = ObjectState &
	TransformedFrame &
	StrokeStyleState &
	FillStyleState &
	TextStyleState;

/**
 * Create the display component for Frame-based shapes (rect / diamond / ellipse, etc. that have
 * stroke + fill + text + a single SVG shape).
 *
 * These are completely identical down to transform application, color resolution (auto), dashes,
 * text overlay, and memo; the only difference is the SVG shape drawn. So the common part is
 * consolidated here, and each shape only passes a `draw` function that returns its shape. `draw`
 * receives the state (width/height/rx, etc.) and the shared attributes `shape`.
 *
 * The text region is derived from the state's stamped `features` descriptor via
 * `calcTextRegion` (no `textRegion` declared = full bbox).
 *
 * Shadowed stickies and svg wrapped by DOMPurify are out of scope because their draw structure differs.
 */
export const createFrameObject = <TState extends FrameRenderState>(
	draw: (state: TState, shape: FrameShapeProps) => ReactNode,
): React.FC<TState & TextEditable> => {
	const FrameObject: React.FC<TState & TextEditable> = (props) => {
		const {
			id,
			cx,
			cy,
			width,
			height,
			scaleX,
			scaleY,
			rotation,
			fill,
			stroke,
			strokeWidth,
			strokeDashType,
			text,
			textType,
			textAlign,
			verticalAlign,
			fontColor,
			fontSize,
			fontFamily,
			fontWeight,
			features,
			isEditing = false,
		} = props;

		const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

		const shape: FrameShapeProps = {
			"data-kind": "object",
			"data-id": id,
			transform: transformAttr,
			strokeColor: resolveAutoColor(stroke, "ink"),
			fillColor: resolveAutoColor(fill, "surface"),
			strokeWidth,
			strokeDasharray: getStrokeDasharray(strokeDashType, strokeWidth),
		};

		const textRegion = calcTextRegion({ width, height }, features?.textRegion);

		return (
			<>
				{draw(props, shape)}
				<TextOverlay
					x={textRegion.x}
					y={textRegion.y}
					width={textRegion.width}
					height={textRegion.height}
					transform={transformAttr}
					text={text}
					textType={textType}
					textAlign={textAlign}
					verticalAlign={verticalAlign}
					fontColor={fontColor}
					fontSize={fontSize}
					fontFamily={fontFamily}
					fontWeight={fontWeight}
					isEditing={isEditing}
				/>
			</>
		);
	};

	return memo(FrameObject) as React.FC<TState & TextEditable>;
};

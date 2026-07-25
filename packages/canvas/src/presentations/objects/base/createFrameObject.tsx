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
import { useObjectTextRegionRegistry } from "../registry/ObjectTextRegionRegistryContext";
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
	Partial<TextStyleState>;

/**
 * The placed, style-resolved text box handed to a custom overlay renderer:
 * the region from ObjectTextRegionRegistry, the shape's transform, and the
 * typography the shape carries. Most renderers pass these straight through to
 * {@link import("./TextOverlay").TextOverlayFrame} and only supply their own body.
 */
export type FrameTextOverlayProps = {
	/** Text region left edge in local coordinates (shape center as origin). */
	x: number;
	/** Text region top edge in local coordinates (shape center as origin). */
	y: number;
	/** Text region width; may be negative for a flipped shape. */
	width: number;
	/** Text region height; may be negative for a flipped shape. */
	height: number;
	/** The shape's SVG transform matrix; apply it so text follows the shape. */
	transform: string;
	/** The shape's raw text — Markdown source, or whatever the type stores. */
	text?: string;
	textAlign?: TextStyleState["textAlign"];
	verticalAlign?: TextStyleState["verticalAlign"];
	/** May be `"auto"`; resolve with resolveAutoColor (TextOverlayFrame already does). */
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
	/** True while the in-place editor is open: draw nothing, or it doubles up with the textarea. */
	isEditing: boolean;
};

/**
 * Draws a shape's text. Supplied by types that render something other than
 * plain text (Markdown, for one); omitted, the shared plain-text TextOverlay is used.
 */
export type FrameTextOverlayRenderer = (
	props: FrameTextOverlayProps,
) => ReactNode;

/**
 * Create the display component for Frame-based shapes (rect / diamond / ellipse, etc. that have
 * stroke + fill + text + a single SVG shape).
 *
 * These are completely identical down to transform application, color resolution (auto), dashes,
 * text overlay, and memo; the only difference is the SVG shape drawn. So the common part is
 * consolidated here, and each shape only passes a `draw` function that returns its shape. `draw`
 * receives the state (width/height/rx, etc.) and the shared attributes `shape`.
 *
 * The text region is derived from the type's calculator in ObjectTextRegionRegistry
 * via `calcTextRegion` (unregistered = full bbox).
 *
 * `renderTextOverlay` swaps out how the text is drawn while keeping every shared
 * derivation (transform, resolved colors, dashes, region, memo) here. A type
 * whose body is not plain text passes one; it receives the placed box and draws
 * into `TextOverlayFrame` so display keeps matching the editing textarea.
 *
 * Shadowed stickies and svg wrapped by DOMPurify are out of scope because their draw structure differs.
 */
export const createFrameObject = <TState extends FrameRenderState>(
	draw: (state: TState, shape: FrameShapeProps) => ReactNode,
	renderTextOverlay?: FrameTextOverlayRenderer,
): React.FC<TState & TextEditable> => {
	const FrameObject: React.FC<TState & TextEditable> = (props) => {
		const {
			id,
			type,
			cx,
			cy,
			scaleX,
			scaleY,
			rotation,
			fill,
			stroke,
			strokeWidth,
			strokeDashType,
			text,
			textAlign,
			verticalAlign,
			fontColor,
			fontSize,
			fontFamily,
			fontWeight,
			isEditing = false,
		} = props;

		const textRegionCalculator = useObjectTextRegionRegistry().get(type);
		const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);
		// Text-less shapes (features.text: false, e.g. cross / extract) draw no
		// TextOverlay; this matches the same features.text gate used by the
		// text-edit gesture and property-update side.
		const hasText = props.features?.text === true;

		const shape: FrameShapeProps = {
			"data-kind": "object",
			"data-id": id,
			transform: transformAttr,
			strokeColor: resolveAutoColor(stroke, "ink"),
			fillColor: resolveAutoColor(fill, "surface"),
			strokeWidth,
			strokeDasharray: getStrokeDasharray(strokeDashType, strokeWidth),
		};

		const textRegion = calcTextRegion(props, textRegionCalculator);

		return (
			<>
				{draw(props, shape)}
				{hasText &&
					(renderTextOverlay ? (
						renderTextOverlay({
							x: textRegion.x,
							y: textRegion.y,
							width: textRegion.width,
							height: textRegion.height,
							transform: transformAttr,
							text,
							textAlign,
							verticalAlign,
							fontColor,
							fontSize,
							fontFamily,
							fontWeight,
							isEditing,
						})
					) : (
						<TextOverlay
							x={textRegion.x}
							y={textRegion.y}
							width={textRegion.width}
							height={textRegion.height}
							transform={transformAttr}
							text={text}
							textAlign={textAlign}
							verticalAlign={verticalAlign}
							fontColor={fontColor}
							fontSize={fontSize}
							fontFamily={fontFamily}
							fontWeight={fontWeight}
							isEditing={isEditing}
						/>
					))}
			</>
		);
	};

	return memo(FrameObject) as React.FC<TState & TextEditable>;
};

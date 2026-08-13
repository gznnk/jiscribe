import type { TransformedFrame } from "@jiscribe/geometry";
import { Fragment, memo } from "react";
import type React from "react";
import type { ReactNode } from "react";

import { TextOverlay } from "./TextOverlay";
import type { TextEditable } from "./TextOverlay";
import { BODY_TEXT_SLOT_ID } from "../../../constants/textSlotId";
import type { RichText } from "../../../schemas/objects/types/RichText";
import type { TextSlot } from "../../../schemas/objects/types/TextSlot";
import type { FillStyleState } from "../../../states/objects/base/FillStyleState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StrokeStyleState } from "../../../states/objects/base/StrokeStyleState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import { readRichTextSlot } from "../../../states/objects/types/TextSlots";
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
 * typography the slot carries. Most renderers pass these straight through to
 * {@link import("./TextOverlay").TextOverlayFrame} and only supply their own body.
 */
export type FrameTextOverlayProps = {
	/** Which slot is being drawn: a key of `state.text`. Single-slot shapes ignore it. */
	slotId: string;
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
	/**
	 * The slot's raw text — Markdown source, or whatever the type stores (rows are
	 * "\n"-joined). The run form when parts of it are styled on their own; a
	 * renderer that only wants the characters flattens it with `richTextToPlain`.
	 */
	text?: RichText;
	textAlign?: TextSlot["textAlign"];
	verticalAlign?: TextSlot["verticalAlign"];
	/** May be `"auto"`; resolve with resolveAutoColor (TextOverlayFrame already does). */
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
	fontStyle?: string;
	textDecoration?: string;
	/**
	 * True while the in-place editor is open **on this slot**: draw nothing, or it
	 * doubles up with the editor. The shape's other slots stay drawn.
	 */
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
 * Text follows `features.text`: a "body" type draws its single body slot, a
 * "slots" type draws one overlay per key of `state.text` (the authority on which
 * slots the shape has). Each overlay is placed by the type's calculator in
 * ObjectTextRegionRegistry via `calcTextRegion` (unregistered = full bbox).
 * Editing blanks only the slot the editor is over (`editingSlotId`), so a
 * multi-slot shape keeps showing the rest.
 *
 * `renderTextOverlay` swaps out how the text is drawn while keeping every shared
 * derivation (transform, resolved colors, dashes, region, memo) here. A type
 * whose body is not plain text passes one; it receives the placed box and draws
 * into `TextOverlayFrame` so display keeps matching the editing surface.
 *
 * Out of scope for types whose draw structure differs: a shadowed shape drawing a
 * group of its own (the sticky in `@jiscribe/plugin-sticky-shape`), and svg
 * wrapped by DOMPurify. Those hand-write the component and reach for
 * `calcTextRegion` / `createSvgTransform` directly.
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
			isEditing = false,
			editingSlotId,
		} = props;

		const textRegionCalculator = useObjectTextRegionRegistry().get(type);
		const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);
		// The features.text gate matches the one used by the text-edit gesture and
		// property-update side: unset draws no overlay, "body" draws its one named
		// slot, "slots" enumerates state.text.
		const textShape = props.features?.text;

		const shape: FrameShapeProps = {
			"data-kind": "object",
			"data-id": id,
			transform: transformAttr,
			strokeColor: resolveAutoColor(stroke, "ink"),
			fillColor: resolveAutoColor(fill, "surface"),
			strokeWidth,
			strokeDasharray: getStrokeDasharray(strokeDashType, strokeWidth),
		};

		const drawSlotOverlay = (slotId: string, slot: TextSlot): ReactNode => {
			const textRegion = calcTextRegion(props, slotId, textRegionCalculator);
			const overlayProps: FrameTextOverlayProps = {
				slotId,
				x: textRegion.x,
				y: textRegion.y,
				width: textRegion.width,
				height: textRegion.height,
				transform: transformAttr,
				text: readRichTextSlot(text, slotId),
				textAlign: slot.textAlign,
				verticalAlign: slot.verticalAlign,
				fontColor: slot.fontColor,
				fontSize: slot.fontSize,
				fontFamily: slot.fontFamily,
				fontWeight: slot.fontWeight,
				fontStyle: slot.fontStyle,
				textDecoration: slot.textDecoration,
				// Only the slot the editor is over must go blank; a caller that
				// names no slot is editing the shape as a whole.
				isEditing:
					isEditing &&
					(editingSlotId === undefined || editingSlotId === slotId),
			};
			return renderTextOverlay ? (
				renderTextOverlay(overlayProps)
			) : (
				<TextOverlay {...overlayProps} />
			);
		};

		// A "body" shape addresses its one slot by name rather than enumerating,
		// so a malformed multi-slot state cannot overlap-draw; a missing body slot
		// draws nothing, same as the enumeration would.
		const bodySlot = text?.[BODY_TEXT_SLOT_ID];

		return (
			<>
				{draw(props, shape)}
				{textShape === "body" &&
					bodySlot !== undefined &&
					drawSlotOverlay(BODY_TEXT_SLOT_ID, bodySlot)}
				{textShape === "slots" &&
					Object.entries(text ?? {}).map(([slotId, slot]) => (
						<Fragment key={slotId}>{drawSlotOverlay(slotId, slot)}</Fragment>
					))}
			</>
		);
	};

	return memo(FrameObject) as React.FC<TState & TextEditable>;
};

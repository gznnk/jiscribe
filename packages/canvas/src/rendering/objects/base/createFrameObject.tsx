import { joinRichTextLines } from "@jiscribe/doc/model/objects/types/text/RichText";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import type { TextSlot } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import {
	isTextRows,
	BODY_TEXT_SLOT_ID,
} from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { isSingleBodyText } from "@jiscribe/doc/model/objects/types/text/TextType";
import type { TransformedFrame } from "@jiscribe/geometry";
import { memo, useMemo, useRef } from "react";
import type React from "react";
import type { ReactNode } from "react";

import { TextOverlay } from "./TextOverlay";
import type { TextEditable } from "./TextOverlay";
import type { FillStyleState } from "../../../states/objects/base/FillStyleState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { StrokeStyleState } from "../../../states/objects/base/StrokeStyleState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import { useFontsLoadedNonceContext } from "../FontsLoadedNonceContext";
import { TEXT_SLOT_PART_KIND } from "../registry/ObjectPartKindRegistry";
import { useObjectPartKindRegistry } from "../registry/ObjectPartKindRegistryContext";
import { useObjectShapeStyleDefaultsRegistry } from "../registry/ObjectShapeStyleDefaultsRegistryContext";
import { useObjectTextStyleDefaultsRegistry } from "../registry/ObjectTextStyleDefaultsRegistryContext";
import { calcTextRegion, calcTextSlotRegions } from "../utils/calcTextRegion";
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
	/** Stroke color the shape draws with, `"auto"` already resolved to the theme ink. */
	strokeColor: string;
	/** Fill color the shape draws with, `"auto"` already resolved to the theme surface. */
	fillColor: string;
	/** Stroke width the shape draws with; an absent document value is resolved to the type's own default, else DEFAULT_STROKE_WIDTH. */
	strokeWidth: number;
	/** Stroke opacity from 0 to 1, multiplying the alpha `strokeColor` already carries; an absent document value is resolved to the type's own default, else DEFAULT_STROKE_OPACITY. Named apart from the CSS property it feeds (see shapePaint). */
	strokeAlpha: number;
	/** Fill opacity from 0 to 1, multiplying the alpha `fillColor` already carries; an absent document value is resolved to the type's own default, else DEFAULT_FILL_OPACITY. Named apart from the CSS property it feeds (see shapePaint). */
	fillAlpha: number;
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
 * the region the type's `"textSlot"` part kind places it in, the shape's transform, and the
 * typography the slot is drawn with — the slot's own fields over the shape
 * type's defaults (ObjectTextStyleDefaultsRegistry), so a renderer never sees an
 * unset field the type had an answer for. Most renderers pass these straight
 * through to {@link import("./TextOverlay").TextOverlayFrame} and only supply
 * their own body.
 */
export type FrameTextOverlayProps = {
	/** Which slot is being drawn: a key of `state.text`. Single-slot shapes ignore it. */
	textSlotId: string;
	/** Text region left edge in local coordinates (shape center as origin). */
	x: number;
	/** Text region top edge in local coordinates (shape center as origin). */
	y: number;
	/** Text region width; may be negative for a flipped shape. */
	width: number;
	/** Text region height; may be negative for a flipped shape. */
	height: number;
	/**
	 * Left unset by createFrameObject, which draws every overlay inside a group
	 * already carrying the shape's transform; pass it on to TextOverlayFrame as is.
	 */
	transform?: string;
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
 * Fields no text region reads: a region is placed in the shape's local space,
 * before the transform puts it on the canvas (calcTextRegion), and these are
 * what a move or a rotation writes.
 */
const PLACEMENT_FIELDS: ReadonlySet<string> = new Set(["cx", "cy", "rotation"]);

/**
 * Whether two states hold the same value, by reference, in every field but the
 * placement. A field one of them leaves out compares as undefined, as every
 * reader sees it. Walked with `for...in` rather than over `Object.keys`, which
 * would allocate two arrays per shape on every frame of a drag.
 */
const differsInPlacementAlone = (previous: object, next: object): boolean => {
	const previousRecord = previous as Record<string, unknown>;
	const nextRecord = next as Record<string, unknown>;
	for (const field in nextRecord) {
		if (
			previousRecord[field] !== nextRecord[field] &&
			!PLACEMENT_FIELDS.has(field)
		) {
			return false;
		}
	}
	for (const field in previousRecord) {
		if (
			previousRecord[field] !== nextRecord[field] &&
			!PLACEMENT_FIELDS.has(field)
		) {
			return false;
		}
	}
	return true;
};

/**
 * The props to place and draw the text from: the ones last taken, for as long as
 * nothing but the placement has changed since, so every frame of a move or a
 * rotation reuses the regions and the overlay elements built from them. Latched
 * during render, as the overlays are built in the same render.
 */
const useTextPlacementSource = <TProps extends object>(
	props: TProps,
): TProps => {
	const latchedRef = useRef(props);
	if (!differsInPlacementAlone(latchedRef.current, props)) {
		latchedRef.current = props;
	}
	return latchedRef.current;
};

/**
 * Create the display component for Frame-based shapes (rect / diamond / ellipse, etc. that have
 * stroke + fill + text + a single SVG shape).
 *
 * These are completely identical down to transform application, color resolution (auto), dashes,
 * text overlay, and memo; the only difference is the SVG shape drawn. So the common part is
 * consolidated here, and each shape only passes a `draw` function that returns its shape. `draw`
 * receives the state (width/height/rx, etc.) and the shared attributes `shape`.
 *
 * Stroke and fill are resolved in three steps, the same way text styling is: the
 * object's own fields, then the type's own defaults
 * (ObjectShapeStyleDefaultsRegistry), then the shared last resort
 * (SHAPE_STYLE_FALLBACK). A document that omits `fill` on a type declaring
 * `"auto"` therefore draws the theme surface, matching what the editor's factory
 * would have written.
 *
 * Text follows `features.text`: a root-form type ("body" / "source") draws its
 * single body slot, a "slots" type draws one overlay per key of `state.text` (the
 * authority on which slots the shape has). Each overlay is placed by the type's
 * registered `"textSlot"` part kind (unregistered = full bbox): the body via
 * `calcTextRegion`, the slots via `calcTextSlotRegions` once per render, so a
 * kind declaring `regions` lays its slots out once rather than once per slot.
 * Editing blanks only the slot the editor is over (`editingTextSlotId`), so a
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
 * `calcTextRegion` / `createSvgTransform` / `resolveAutoColor` directly — every
 * derivation below is theirs to repeat.
 */
export const createFrameObject = <TState extends FrameRenderState>(
	draw: (state: TState, shape: FrameShapeProps) => ReactNode,
	renderTextOverlay?: FrameTextOverlayRenderer,
): React.FC<TState & TextEditable> => {
	// One overlay of one slot, as a component (keyed by slot id) rather than a
	// render helper, so the joined body below can live in a per-slot useMemo.
	// Memoized on props that carry nothing of the shape's position or transform
	// (FrameObject draws the overlays inside a group carrying it), so a move or a
	// rotation re-renders no overlay at all.
	const TextSlotOverlayComponent: React.FC<{
		/** The shape's type, which the slot's style defaults are looked up under. */
		objectType: string;
		textSlotId: string;
		textSlot: TextSlot;
		/** Region left edge in local coordinates, already placed by FrameObject (calcTextRegion / calcTextSlotRegions). */
		regionX: number;
		/** Region top edge in local coordinates. */
		regionY: number;
		/** Region width; may be negative for a flipped shape. */
		regionWidth: number;
		/** Region height; may be negative for a flipped shape. */
		regionHeight: number;
		/** True while the in-place editor is open on this very slot. */
		isEditing: boolean;
	}> = ({
		objectType,
		textSlotId,
		textSlot,
		regionX,
		regionY,
		regionWidth,
		regionHeight,
		isEditing,
	}) => {
		const textStyleDefaults = useObjectTextStyleDefaultsRegistry();

		// The type's own defaults for this slot stand in for whatever the slot
		// leaves unset, the same resolution the editing surface and text
		// measurement make.
		const style = textStyleDefaults.resolveTextSlotStyle(
			objectType,
			textSlotId,
			textSlot,
		);
		// The single body the slot draws as (the rows form is "\n"-joined, see
		// readRichTextSlot). Joining builds a fresh value, so it is held per slot
		// keyed on the content: a re-render that did not touch this slot's text
		// passes the same `text` identity on and keeps TextOverlay's memo intact.
		const text = useMemo<RichText>(
			() =>
				isTextRows(textSlot.text)
					? joinRichTextLines(textSlot.text)
					: textSlot.text,
			[textSlot.text],
		);

		const overlayProps: FrameTextOverlayProps = {
			textSlotId,
			x: regionX,
			y: regionY,
			width: regionWidth,
			height: regionHeight,
			text,
			textAlign: style.textAlign,
			verticalAlign: style.verticalAlign,
			fontColor: style.fontColor,
			fontSize: style.fontSize,
			fontFamily: style.fontFamily,
			fontWeight: style.fontWeight,
			fontStyle: style.fontStyle,
			textDecoration: style.textDecoration,
			isEditing,
		};
		return renderTextOverlay ? (
			renderTextOverlay(overlayProps)
		) : (
			<TextOverlay {...overlayProps} />
		);
	};
	const TextSlotOverlay = memo(TextSlotOverlayComponent);

	const FrameObject: React.FC<TState & TextEditable> = (props) => {
		const {
			id,
			cx,
			cy,
			scaleX,
			scaleY,
			rotation,
			fill,
			fillOpacity,
			stroke,
			strokeWidth,
			strokeDashType,
			strokeOpacity,
		} = props;

		const shapeStyle = useObjectShapeStyleDefaultsRegistry().resolveShapeStyle(
			props.type,
			{
				stroke,
				strokeWidth,
				strokeDashType,
				strokeOpacity,
				fill,
				fillOpacity,
			},
		);

		// Read only as a memo key below: `draw` and the slot regions measure text,
		// and a context change is what gets past this component's memo when a face
		// lands after the first paint.
		const fontsLoadedNonce = useFontsLoadedNonceContext();
		const textSlotKind = useObjectPartKindRegistry().get(
			props.type,
			TEXT_SLOT_PART_KIND,
		);

		const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);
		// The features.text gate matches the one used by the text-edit gesture and
		// property-update side: unset draws no overlay, a root form draws its one
		// named slot, "slots" enumerates state.text.
		const textType = props.features?.text;
		const textSource = useTextPlacementSource(props);
		const textSlotRegions = useMemo(
			() =>
				textType === "slots"
					? calcTextSlotRegions(textSource, textSlotKind)
					: undefined,
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[textSource, textSlotKind, textType, fontsLoadedNonce],
		);

		const shape: FrameShapeProps = {
			"data-kind": "object",
			"data-id": id,
			transform: transformAttr,
			strokeColor: resolveAutoColor(shapeStyle.stroke, "ink"),
			fillColor: resolveAutoColor(shapeStyle.fill, "surface"),
			strokeWidth: shapeStyle.strokeWidth,
			strokeAlpha: shapeStyle.strokeOpacity,
			fillAlpha: shapeStyle.fillOpacity,
			strokeDasharray: getStrokeDasharray(
				shapeStyle.strokeDashType,
				shapeStyle.strokeWidth,
			),
		};

		const overlays = useMemo(() => {
			const {
				text: sourceText,
				type,
				isEditing = false,
				editingTextSlotId,
			} = textSource;
			// Only the slot the editor is over must go blank; a caller that names no
			// slot is editing the shape as a whole.
			const isEditingSlot = (slotId: string): boolean =>
				isEditing &&
				(editingTextSlotId === undefined || editingTextSlotId === slotId);

			// A root-form shape addresses its one slot by name rather than enumerating,
			// so a malformed multi-slot state cannot overlap-draw; a missing body slot
			// draws nothing, same as the enumeration would.
			const bodySlot = sourceText?.[BODY_TEXT_SLOT_ID];
			if (isSingleBodyText(textType) && bodySlot !== undefined) {
				const bodyRegion = calcTextRegion(
					textSource,
					BODY_TEXT_SLOT_ID,
					textSlotKind,
				);
				return (
					<TextSlotOverlay
						objectType={type}
						textSlotId={BODY_TEXT_SLOT_ID}
						textSlot={bodySlot}
						regionX={bodyRegion.x}
						regionY={bodyRegion.y}
						regionWidth={bodyRegion.width}
						regionHeight={bodyRegion.height}
						isEditing={isEditingSlot(BODY_TEXT_SLOT_ID)}
					/>
				);
			}
			if (textSlotRegions === undefined || sourceText === undefined) {
				return null;
			}
			return Object.entries(sourceText).map(([slotId, slot]) => (
				<TextSlotOverlay
					key={slotId}
					objectType={type}
					textSlotId={slotId}
					textSlot={slot}
					regionX={textSlotRegions[slotId].x}
					regionY={textSlotRegions[slotId].y}
					regionWidth={textSlotRegions[slotId].width}
					regionHeight={textSlotRegions[slotId].height}
					isEditing={isEditingSlot(slotId)}
				/>
			));
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [textSource, textSlotKind, textType, textSlotRegions, fontsLoadedNonce]);

		// The overlays sit in a group of their own carrying the shape's transform,
		// so the transform reaches none of them as a prop: a move or a rotation
		// changes this one attribute and reuses every overlay element as it is.
		// Image export folds the group back into its children (buildExportSvg).
		return (
			<>
				{draw(props, shape)}
				{overlays !== null && (
					<g transform={transformAttr} data-canvas-export="flatten">
						{overlays}
					</g>
				)}
			</>
		);
	};

	return memo(FrameObject) as React.FC<TState & TextEditable>;
};

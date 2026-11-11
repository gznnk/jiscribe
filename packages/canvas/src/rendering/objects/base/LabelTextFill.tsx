import {
	richTextMaxFontSize,
	richTextToPlain,
} from "@jiscribe/doc/model/objects/types/text/RichText";
import type { TextSlot } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import {
	BODY_TEXT_SLOT_ID,
	readTextSlotContent,
} from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";
import {
	convertBoundingBoxToRect,
	convertRectToBoundingBox,
} from "@jiscribe/geometry";
import type { Rect } from "@jiscribe/geometry";
import type React from "react";
import { memo, useMemo } from "react";

import {
	LABEL_BACKDROP_SHAPE_RENDERING,
	LabelBackdropLayers,
} from "./LabelBackdropLayers";
import { useDocumentSurface } from "../DocumentSurfaceContext";
import { useObjectTextStyleDefaultsRegistry } from "../registry/ObjectTextStyleDefaultsRegistryContext";
import { useIsTextLegible } from "../useIsTextLegible";
import { useLabelBackdropLayers } from "../useLabelBackdropLayers";
import { resolveLabelFill } from "../utils/resolveLabelFill";

type LabelTextFillProps = {
	/** The shape's type, which the caption's style defaults are looked up under. */
	objectType: string;
	/** The shape's body slot: the caption whose box is painted. */
	textSlot: TextSlot;
	/**
	 * The shape's `labelFill` as stored; omitted or `"auto"` knocks out in the
	 * page's color (resolveLabelFill), with the backdrops lying under the caption
	 * painted over it when `ownerId` is given.
	 */
	labelFill: string | undefined;
	/** The caption's box in the shape's local coordinates, as its `"textSlot"` part kind places it. */
	region: Rect;
	/**
	 * The id of the shape owning the caption, under which the surrounding
	 * `<Canvas>` keeps the backdrops it lies on (useLabelBackdropLayers).
	 * Omitted = the page's color alone, wherever the caption lies.
	 */
	ownerId?: string;
};

const LabelTextFillComponent: React.FC<LabelTextFillProps> = ({
	objectType,
	textSlot,
	labelFill,
	region,
	ownerId,
}) => {
	const documentSurface = useDocumentSurface();
	const isAuto = labelFill === undefined || labelFill === AUTO_COLOR;
	const layers = useLabelBackdropLayers(isAuto ? ownerId : undefined);
	// The layers' origin, a flipped shape's region running backwards.
	const layerBox = useMemo(
		() => convertBoundingBoxToRect(convertRectToBoundingBox(region)),
		[region],
	);
	const style = useObjectTextStyleDefaultsRegistry().resolveTextSlotStyle(
		objectType,
		BODY_TEXT_SLOT_ID,
		textSlot,
	);
	const text = readTextSlotContent(textSlot.text);
	// Hidden at the zoom the caption's own text is, so the box never shows empty.
	const isLegible = useIsTextLegible(
		richTextMaxFontSize(text, style.fontSize ?? TEXT_STYLE_FALLBACK.fontSize),
	);

	if (richTextToPlain(text) === "") {
		return null;
	}

	return (
		<>
			<rect
				x={region.x}
				y={region.y}
				width={region.width}
				height={region.height}
				pointerEvents="none"
				display={isLegible ? undefined : "none"}
				shapeRendering={
					layers.length > 0 ? LABEL_BACKDROP_SHAPE_RENDERING : undefined
				}
				// A style rather than the attribute: the knockout is the theme's canvas
				// color unless the document sets an opaque background, and a CSS variable
				// does not resolve in a presentation attribute.
				style={{ fill: resolveLabelFill(labelFill, documentSurface) }}
			/>
			{layers.length > 0 && (
				<LabelBackdropLayers
					box={layerBox}
					layers={layers}
					isShown={isLegible}
				/>
			)}
		</>
	);
};

/**
 * The box painted behind a `features.text: "label"` caption, in the shape's
 * `labelFill`: what knocks out the lines running under the caption, the way a
 * connector's label does. Drawn by createFrameObject ahead of the caption's text;
 * a component written by hand draws it itself, as it does the text, and passes
 * `ownerId` for an `"auto"` caption to be painted on the frames it lies on
 * (LabelBackdropLayers) rather than on the page's color alone.
 *
 * Carries no `data-kind`, so it is no object of its own (the DOM allows one per
 * object), and takes no pointer, the shape's own hit area being what grabs the
 * caption. Draws nothing for an empty caption, and is hidden while the
 * caption's text is too small to read at the canvas's zoom (useIsTextLegible).
 */
export const LabelTextFill = memo(LabelTextFillComponent);

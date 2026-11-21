import { AUTO_COLOR } from "./autoColor";
import { DEFAULT_ARROW, DEFAULT_ARROW_SCALE } from "../base/ArrowStyleDoc";
import type { ArrowStyleDoc } from "../base/ArrowStyleDoc";
import { DEFAULT_FILL, DEFAULT_FILL_OPACITY } from "../base/FillStyleDoc";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import { DEFAULT_CORNER_RADIUS } from "../base/RadiusStyleDoc";
import type { RadiusStyleDoc } from "../base/RadiusStyleDoc";
import {
	DEFAULT_STROKE_DASH,
	DEFAULT_STROKE_OPACITY,
	DEFAULT_STROKE_WIDTH,
} from "../base/StrokeStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";

/**
 * One shape's style fields with every step of the resolution already taken, as
 * {@link resolveShapeStyle} returns it: the four Doc
 * groups flattened, each field required — so a field added to any of them fails
 * to compile until {@link SHAPE_STYLE_FALLBACK} gives it a last resort.
 *
 * The colors may still be `"auto"`, which is the drawing side's to resolve
 * against the theme (resolveAutoColor). Resolving is a read: an undeclared dash
 * reads as solid here and stays undeclared in the document.
 */
export type ResolvedShapeStyle = Required<
	StrokeStyleDoc & FillStyleDoc & RadiusStyleDoc & ArrowStyleDoc
>;

/**
 * What a shape-style field is drawn with when neither the object nor its type
 * declares one (ObjectShapeStyleDefaultsRegistry). The last resort every side
 * that draws or reports a shape style shares — the renderers and the style menus
 * — so it is kept here rather than repeated as a default parameter in each of
 * them.
 */
export const SHAPE_STYLE_FALLBACK = {
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
	strokeDashType: DEFAULT_STROKE_DASH,
	strokeOpacity: DEFAULT_STROKE_OPACITY,
	fill: DEFAULT_FILL,
	fillOpacity: DEFAULT_FILL_OPACITY,
	rx: DEFAULT_CORNER_RADIUS,
	startArrow: DEFAULT_ARROW,
	endArrow: DEFAULT_ARROW,
	arrowScale: DEFAULT_ARROW_SCALE,
} as const satisfies ResolvedShapeStyle;

/**
 * The shape-style fields one object may set: whichever of the four style groups
 * it carries, each optional. What every side that resolves a shape style hands
 * over, and the shape a type's own defaults are held in — a type holding only
 * the fields its creation defaults actually set.
 */
export type ObjectShapeStyleDefaults = Readonly<Partial<ResolvedShapeStyle>>;

/**
 * The style one object is drawn with: its own set fields over its type's
 * defaults over the shared last resort (SHAPE_STYLE_FALLBACK). The one statement
 * of that order, which ObjectShapeStyleDefaultsRegistry.resolveShapeStyle reads
 * through and a headless host with a type's definition in hand calls directly.
 *
 * @param own - The object's own style fields; a field carrying undefined does not shadow the type's default
 * @param typeDefaults - The type's defaults, as extractShapeStyleDefaults reads them; undefined for a type declaring none
 * @returns Every field answered, whatever the type's features say
 */
export const resolveShapeStyle = (
	own: ObjectShapeStyleDefaults,
	typeDefaults: ObjectShapeStyleDefaults | undefined,
): ResolvedShapeStyle => {
	return {
		stroke: own.stroke ?? typeDefaults?.stroke ?? SHAPE_STYLE_FALLBACK.stroke,
		strokeWidth:
			own.strokeWidth ??
			typeDefaults?.strokeWidth ??
			SHAPE_STYLE_FALLBACK.strokeWidth,
		strokeDashType:
			own.strokeDashType ??
			typeDefaults?.strokeDashType ??
			SHAPE_STYLE_FALLBACK.strokeDashType,
		strokeOpacity:
			own.strokeOpacity ??
			typeDefaults?.strokeOpacity ??
			SHAPE_STYLE_FALLBACK.strokeOpacity,
		fill: own.fill ?? typeDefaults?.fill ?? SHAPE_STYLE_FALLBACK.fill,
		fillOpacity:
			own.fillOpacity ??
			typeDefaults?.fillOpacity ??
			SHAPE_STYLE_FALLBACK.fillOpacity,
		rx: own.rx ?? typeDefaults?.rx ?? SHAPE_STYLE_FALLBACK.rx,
		startArrow:
			own.startArrow ??
			typeDefaults?.startArrow ??
			SHAPE_STYLE_FALLBACK.startArrow,
		endArrow:
			own.endArrow ?? typeDefaults?.endArrow ?? SHAPE_STYLE_FALLBACK.endArrow,
		arrowScale:
			own.arrowScale ??
			typeDefaults?.arrowScale ??
			SHAPE_STYLE_FALLBACK.arrowScale,
	};
};

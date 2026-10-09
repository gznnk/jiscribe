import { AUTO_COLOR } from "./autoColor";
import { DEFAULT_ARROW } from "../base/ArrowStyleDoc";
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
 * `ObjectShapeStyleDefaultsRegistry.resolveShapeStyle` returns it: the four Doc
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
} as const satisfies ResolvedShapeStyle;

import { AUTO_COLOR } from "./autoColor";
import { DEFAULT_FILL, DEFAULT_FILL_OPACITY } from "../base/FillStyleDoc";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import {
	DEFAULT_STROKE_OPACITY,
	DEFAULT_STROKE_WIDTH,
} from "../base/StrokeStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";

/**
 * Every stroke and fill field that a last resort can be stated for, each of them
 * required — so a field added to either Doc group fails to compile here and in
 * {@link ResolvedShapeStyle}, which builds on this, until it is given one.
 *
 * `strokeDashType` is the one field left out: an omitted dash is a solid line,
 * which is what drawing no dash array already produces, so there is no value to
 * fall back to.
 */
export type ShapeStyleFallback = Required<
	Omit<StrokeStyleDoc & FillStyleDoc, "strokeDashType">
>;

/**
 * What a stroke or fill field is drawn with when neither the object nor its type
 * declares one (ObjectShapeStyleDefaultsRegistry). The last resort every side
 * that draws or reports a shape style shares — the renderers and the style menus
 * — so it is kept here rather than repeated as a default parameter in each of
 * them.
 */
export const SHAPE_STYLE_FALLBACK = {
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
	strokeOpacity: DEFAULT_STROKE_OPACITY,
	fill: DEFAULT_FILL,
	fillOpacity: DEFAULT_FILL_OPACITY,
} as const satisfies ShapeStyleFallback;

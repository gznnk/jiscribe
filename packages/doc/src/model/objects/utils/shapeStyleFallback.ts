import { AUTO_COLOR } from "./autoColor";
import { DEFAULT_FILL } from "../base/FillStyleDoc";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import { DEFAULT_STROKE_WIDTH } from "../base/StrokeStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";

/**
 * What a stroke or fill field is drawn with when neither the object nor its type
 * declares one (ObjectShapeStyleDefaultsRegistry). The last resort every side
 * that draws or reports a shape style shares — the renderers and the style menus
 * — so it is kept here rather than repeated as a default parameter in each of
 * them.
 *
 * `strokeDashType` is deliberately absent: an omitted dash is a solid line, which
 * is what drawing no dash array already produces, so there is no value to fall
 * back to.
 */
export const SHAPE_STYLE_FALLBACK = {
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
	fill: DEFAULT_FILL,
} as const satisfies Omit<StrokeStyleDoc & FillStyleDoc, "strokeDashType">;

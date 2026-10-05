import { AUTO_COLOR } from "./autoColor";
import { DEFAULT_ARROW } from "../base/ArrowStyleDoc";
import type { ArrowStyleDoc } from "../base/ArrowStyleDoc";
import { DEFAULT_FILL, DEFAULT_FILL_OPACITY } from "../base/FillStyleDoc";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import { DEFAULT_CORNER_RADIUS } from "../base/RadiusStyleDoc";
import type { RadiusStyleDoc } from "../base/RadiusStyleDoc";
import {
	DEFAULT_STROKE_OPACITY,
	DEFAULT_STROKE_WIDTH,
} from "../base/StrokeStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import type { StrokeDashType } from "../types/StrokeDashType";

/**
 * Every shape-style field that a last resort can be stated for, each of them
 * required — so a field added to any of the four Doc groups fails to compile
 * here and in {@link ResolvedShapeStyle}, which builds on this, until it is
 * given one.
 *
 * `strokeDashType` is the one field left out: an omitted dash is a solid line,
 * which is what drawing no dash array already produces, so there is no value to
 * fall back to. What a reader reporting a dash shows instead is
 * {@link UNDECLARED_STROKE_DASH}.
 */
export type ShapeStyleFallback = Required<
	Omit<
		StrokeStyleDoc & FillStyleDoc & RadiusStyleDoc & ArrowStyleDoc,
		"strokeDashType"
	>
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
	strokeOpacity: DEFAULT_STROKE_OPACITY,
	fill: DEFAULT_FILL,
	fillOpacity: DEFAULT_FILL_OPACITY,
	rx: DEFAULT_CORNER_RADIUS,
	startArrow: DEFAULT_ARROW,
	endArrow: DEFAULT_ARROW,
} as const satisfies ShapeStyleFallback;

/**
 * The dash a stroke nobody declared one for is reported as. Resolution leaves
 * `strokeDashType` absent in that case (there being no value to resolve it to),
 * and every surface draws an absent dash solid — so a reader that has to answer
 * with a dash names this one, otherwise an explicit `"solid"` and an omitted
 * dash would read as two values.
 */
export const UNDECLARED_STROKE_DASH: StrokeDashType = "solid";

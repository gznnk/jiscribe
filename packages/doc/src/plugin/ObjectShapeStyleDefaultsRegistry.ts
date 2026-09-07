import { FILL_STYLE_KEYS } from "../model/objects/base/FillStyleDoc";
import type { FillStyleDoc } from "../model/objects/base/FillStyleDoc";
import { STROKE_STYLE_KEYS } from "../model/objects/base/StrokeStyleDoc";
import type { StrokeStyleDoc } from "../model/objects/base/StrokeStyleDoc";
import type { ObjectFeatures } from "../model/objects/types/ObjectFeatures";
import type { ObjectType } from "../model/objects/types/ObjectType";
import type { StrokeDashType } from "../model/objects/types/StrokeDashType";
import { SHAPE_STYLE_FALLBACK } from "../model/objects/utils/shapeStyleFallback";

/**
 * One of the two groups a shape's style fields fall into, named by the
 * ObjectFeatures flag that enables it: `"stroke"` covers StrokeStyleDoc (color,
 * width, dash), `"fill"` covers FillStyleDoc. The unit a type declares support
 * in, and the unit the style menus search the selection by.
 */
export type ShapeStyleGroup = "stroke" | "fill";

/**
 * A type's stroke / fill defaults: whichever of the two style groups its
 * features enable, holding only the fields its creation defaults actually set.
 */
export type ObjectShapeStyleDefaults = Readonly<
	Partial<StrokeStyleDoc & FillStyleDoc>
>;

/**
 * One shape's stroke and fill with every step of the resolution already taken,
 * as {@link ObjectShapeStyleDefaultsRegistry.resolveShapeStyle} returns it. The
 * colors may still be `"auto"`, which is the drawing side's to resolve against
 * the theme (resolveAutoColor).
 */
export type ResolvedShapeStyle = {
	/** Stroke color, or `"auto"` to follow the theme ink. */
	stroke: string;
	/** Stroke width in pixels. */
	strokeWidth: number;
	/** Dash pattern; absent means a solid line, nobody having declared one. */
	strokeDashType?: StrokeDashType;
	/** Fill color, or `"auto"` to follow the theme surface. */
	fill: string;
};

/**
 * The draw-time stroke / fill defaults of one type, read out of the creation
 * defaults it already declares (`ObjectDocDefinition.defaults`), so a type gets
 * its draw-time defaults from the same place its factory materializes them from
 * and the two cannot diverge.
 *
 * Only the groups the type's features enable are read: a stroke-only type
 * contributes no fill even where its defaults happen to state one. Values are
 * taken as they stand — the doc validator is what judges them.
 *
 * @param features - The type's feature flags; one enabling neither `stroke` nor `fill` yields undefined
 * @param defaults - The type's creation defaults (its `*_DOC_DEFAULTS`), undefined for a type that declares none
 * @returns The defaults, or undefined when nothing is declared — the value `register` is meant to be handed
 */
export const extractShapeStyleDefaults = (
	features: ObjectFeatures,
	defaults: Readonly<Record<string, unknown>> | undefined,
): ObjectShapeStyleDefaults | undefined => {
	if (defaults === undefined) {
		return undefined;
	}
	const style: Record<string, unknown> = {};
	const keys = [
		...(features.stroke ? STROKE_STYLE_KEYS : []),
		...(features.fill ? FILL_STYLE_KEYS : []),
	];
	for (const key of keys) {
		const value = defaults[key];
		if (value !== undefined) {
			style[key] = value;
		}
	}
	return Object.keys(style).length === 0
		? undefined
		: (style as ObjectShapeStyleDefaults);
};

/**
 * Per-type stroke / fill defaults: what a shape's style field falls back to when
 * the author left it unset. Registered from each type's own declaration
 * (`extractShapeStyleDefaults`) so the answer is the type's own, and read by
 * every side that draws or reports a shape style.
 *
 * A type registered here contributes nothing to what is saved: the resolution
 * happens per read (`resolveShapeStyle`) and never writes back into the doc or
 * the state, so a field the author omitted stays omitted on the next save.
 *
 * A type absent from the registry resolves to the object's own fields over the
 * shared last resort (SHAPE_STYLE_FALLBACK).
 */
export class ObjectShapeStyleDefaultsRegistry {
	private readonly defaultsByType = new Map<
		ObjectType,
		ObjectShapeStyleDefaults
	>();

	register(type: ObjectType, defaults: ObjectShapeStyleDefaults): void {
		this.defaultsByType.set(type, defaults);
	}

	/**
	 * Registers whatever stroke / fill defaults a type's definition declares
	 * ({@link extractShapeStyleDefaults}); a definition declaring none leaves the
	 * registry as it was.
	 *
	 * @param type - The object type the definition describes
	 * @param definition - The declaring half of an ObjectDocDefinition: its features and creation defaults
	 */
	registerDefinition(
		type: ObjectType,
		definition: {
			features: ObjectFeatures;
			defaults?: Readonly<Record<string, unknown>>;
		},
	): void {
		const defaults = extractShapeStyleDefaults(
			definition.features,
			definition.defaults,
		);
		if (defaults !== undefined) {
			this.register(type, defaults);
		}
	}

	/**
	 * The defaults of one type, or undefined when it declares none.
	 *
	 * @param type - The object type to look up
	 */
	get(type: ObjectType): ObjectShapeStyleDefaults | undefined {
		return this.defaultsByType.get(type);
	}

	/**
	 * The stroke and fill one object is drawn with: its own set fields over its
	 * type's defaults over the shared last resort (SHAPE_STYLE_FALLBACK).
	 *
	 * @param type - The object's type; one with nothing registered contributes no defaults
	 * @param own - The object's own style fields; a field carrying undefined does not shadow the type's default
	 * @returns Stroke color, width and fill always answered; the dash only where one side sets it
	 */
	resolveShapeStyle(
		type: ObjectType,
		own: Readonly<Partial<StrokeStyleDoc & FillStyleDoc>>,
	): ResolvedShapeStyle {
		const typeDefaults = this.get(type);
		return {
			stroke: own.stroke ?? typeDefaults?.stroke ?? SHAPE_STYLE_FALLBACK.stroke,
			strokeWidth:
				own.strokeWidth ??
				typeDefaults?.strokeWidth ??
				SHAPE_STYLE_FALLBACK.strokeWidth,
			strokeDashType: own.strokeDashType ?? typeDefaults?.strokeDashType,
			fill: own.fill ?? typeDefaults?.fill ?? SHAPE_STYLE_FALLBACK.fill,
		};
	}

	clear(): void {
		this.defaultsByType.clear();
	}
}

export const createObjectShapeStyleDefaultsRegistry =
	(): ObjectShapeStyleDefaultsRegistry =>
		new ObjectShapeStyleDefaultsRegistry();

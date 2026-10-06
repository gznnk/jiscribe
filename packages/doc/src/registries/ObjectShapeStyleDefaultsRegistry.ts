import { ARROW_STYLE_KEYS } from "../model/objects/base/ArrowStyleDoc";
import type { ArrowStyleDoc } from "../model/objects/base/ArrowStyleDoc";
import { FILL_STYLE_KEYS } from "../model/objects/base/FillStyleDoc";
import type { FillStyleDoc } from "../model/objects/base/FillStyleDoc";
import { RADIUS_STYLE_KEYS } from "../model/objects/base/RadiusStyleDoc";
import type { RadiusStyleDoc } from "../model/objects/base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "../model/objects/base/StrokeStyleDoc";
import type { StrokeStyleDoc } from "../model/objects/base/StrokeStyleDoc";
import type { ObjectFeatures } from "../model/objects/types/ObjectFeatures";
import type { ObjectType } from "../model/objects/types/ObjectType";
import { pickDefined } from "../model/objects/utils/pickDefined";
import { SHAPE_STYLE_FALLBACK } from "../model/objects/utils/shapeStyleFallback";
import type { ShapeStyleFallback } from "../model/objects/utils/shapeStyleFallback";

/**
 * One of the two paint groups a selection can be searched by, named by the
 * ObjectFeatures flag that enables it: `"stroke"` covers StrokeStyleDoc (color,
 * width, dash, opacity), `"fill"` covers FillStyleDoc. The unit the first-match
 * readers go by (getFirstSelectedWithStyleGroup); the radius and the arrowheads
 * are style groups of their own and have no such reader.
 */
export type ShapeStyleGroup = "stroke" | "fill";

/**
 * The shape-style fields one object may set, the four style groups flattened the
 * way a doc and a state alike carry them. What every side that resolves a shape
 * style hands over, and the shape a type's own defaults are held in.
 */
export type ShapeStyleDocFields = Partial<
	StrokeStyleDoc & FillStyleDoc & RadiusStyleDoc & ArrowStyleDoc
>;

/**
 * A type's shape-style defaults: whichever of the style groups its features
 * enable, holding only the fields its creation defaults actually set.
 */
export type ObjectShapeStyleDefaults = Readonly<ShapeStyleDocFields>;

/**
 * One shape's style fields with every step of the resolution already taken, as
 * {@link ObjectShapeStyleDefaultsRegistry.resolveShapeStyle} returns it. The
 * colors may still be `"auto"`, which is the drawing side's to resolve against
 * the theme (resolveAutoColor). Resolving is a read: an undeclared dash reads as
 * solid here and stays undeclared in the document.
 */
export type ResolvedShapeStyle = ShapeStyleFallback;

/**
 * The draw-time shape-style defaults of one type, read out of the creation
 * defaults it already declares (`ObjectDocDefinition.defaults`), so a type gets
 * its draw-time defaults from the same place its factory materializes them from
 * and the two cannot diverge.
 *
 * Only the groups the type's features enable are read: a stroke-only type
 * contributes no fill even where its defaults happen to state one, and an
 * ellipse's `rx` — geometry rather than a corner radius — is left out for want
 * of `features.radius`. Values are taken as they stand — the doc validator is
 * what judges them.
 *
 * @param features - The type's feature flags; one enabling none of `stroke` / `fill` / `radius` / `arrow` yields undefined
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
	// The creation defaults spell every style group out flat on the doc, so they
	// are read as the groups' own fields.
	const shapeDefaults: ObjectShapeStyleDefaults = defaults;
	const style = pickDefined(shapeDefaults, [
		...(features.stroke ? STROKE_STYLE_KEYS : []),
		...(features.fill ? FILL_STYLE_KEYS : []),
		...(features.radius ? RADIUS_STYLE_KEYS : []),
		...(features.arrow ? ARROW_STYLE_KEYS : []),
	]);
	return Object.keys(style).length === 0 ? undefined : style;
};

/**
 * Per-type shape-style defaults: what a shape's style field falls back to when
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
	 * Registers whatever shape-style defaults a type's definition declares
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
	 * The style one object is drawn with: its own set fields over its type's
	 * defaults over the shared last resort (SHAPE_STYLE_FALLBACK).
	 *
	 * Every field is answered whatever the type's features say, the caller having
	 * already decided which of them its shape has a say about (the style tables
	 * gate the intents, the renderers read only what they draw).
	 *
	 * @param type - The object's type; one with nothing registered contributes no defaults
	 * @param own - The object's own style fields; a field carrying undefined does not shadow the type's default
	 * @returns Every field answered
	 */
	resolveShapeStyle(
		type: ObjectType,
		own: Readonly<ShapeStyleDocFields>,
	): ResolvedShapeStyle {
		const typeDefaults = this.get(type);
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
		};
	}

	clear(): void {
		this.defaultsByType.clear();
	}
}

export const createObjectShapeStyleDefaultsRegistry =
	(): ObjectShapeStyleDefaultsRegistry =>
		new ObjectShapeStyleDefaultsRegistry();

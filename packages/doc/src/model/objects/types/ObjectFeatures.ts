import type { GeometryType } from "./GeometryType";
import type { ObjectType } from "./ObjectType";
import type { TextType } from "./text/TextType";

/**
 * Per-type declaration descriptor for canvas objects. Each entry decides one or
 * more of: which field groups the Doc / State types carry (CreateObjectType /
 * CreateObjectState), what a doc of the type is accepted with at runtime, or
 * how the type behaves on the canvas.
 */
export type ObjectFeatures = {
	/** The doc's `type` value; a type registered twice (built-in or plugin) is refused. */
	type: ObjectType;
	/** Which coordinate fields the doc carries (see GeometryType). */
	geometry: GeometryType;
	/** Position, rotation, and flip transformation (TransformDoc) */
	transform?: boolean;
	/** Stroke/border styling (StrokeStyleDoc) */
	stroke?: boolean;
	/** Fill/background styling (FillStyleDoc) */
	fill?: boolean;
	/** Corner radius `rx` (RadiusStyleDoc), for a type with rect geometry */
	radius?: boolean;
	/** Arrowhead ends (startArrow / endArrow) and their size (arrowScale) */
	arrow?: boolean;
	/** How the type holds its text (see {@link TextType}); left out by a type holding none */
	text?: TextType;
	/**
	 * Lets the body's `verticalAlign` be measured against the whole height rather
	 * than the declared region (TextVerticalBasis). Declared exactly when
	 * that region gives up part of the height (a cylinder's caps, a header band);
	 * needs `text` "body" or "source". Gates what is accepted at runtime, not the Doc type.
	 */
	textVerticalBasis?: boolean;
	/** Whether a connector may end on this object; omitted = false. Read by the parser, ops and canvas alike. */
	connectable?: boolean;
};

/** Boolean flag keys of ObjectFeatures (excludes the structural `type` / `geometry`). */
export type ObjectFeatureFlag = {
	[K in keyof ObjectFeatures]-?: ObjectFeatures[K] extends boolean | undefined
		? K
		: never;
}[keyof ObjectFeatures];

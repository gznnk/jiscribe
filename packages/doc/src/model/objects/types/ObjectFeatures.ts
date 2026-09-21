import type { GeometryType } from "./GeometryType";
import type { ObjectType } from "./ObjectType";
import type { TextType } from "./text/TextType";

/**
 * Per-type declaration descriptor for canvas objects.
 * The flags control which feature interfaces are included in the generated
 * object types (Doc / State); `text` also picks the doc form its text takes.
 */
export type ObjectFeatures = {
	/** Object type identifier */
	type: ObjectType;
	/** Geometry type of the object */
	geometry: GeometryType;
	/** Position, rotation, and flip transformation (TransformDoc) */
	transform?: boolean;
	/** Stroke/border styling (StrokeStyleDoc) */
	stroke?: boolean;
	/** Fill/background styling (FillStyleDoc) */
	fill?: boolean;
	/** How the type holds its text (see {@link TextType}); left out by a type holding none */
	text?: TextType;
	/** Corner radius styling (for rect) */
	radius?: boolean;
	/** Arrowhead ends (startArrow / endArrow) */
	arrow?: boolean;
	/** Whether this object can be used as a connector endpoint target */
	connectable?: boolean;
};

/** Boolean flag keys of ObjectFeatures (excludes the structural `type` / `geometry`). */
export type ObjectFeatureFlag = {
	[K in keyof ObjectFeatures]-?: ObjectFeatures[K] extends boolean | undefined
		? K
		: never;
}[keyof ObjectFeatures];

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
	/**
	 * Holds `textVerticalBasis` (TextVerticalBasis): its one body may be measured
	 * against the shape's whole height rather than the region the type declares.
	 * Declared only by a type whose region gives up part of that height — a
	 * cylinder's caps, a document's wavy foot, a container's header band — since
	 * on any other type the two bases name one place.
	 */
	textVerticalBasis?: boolean;
	/** Corner radius styling (for rect) */
	radius?: boolean;
	/** Arrowhead ends (startArrow / endArrow) and their size (arrowScale) */
	arrow?: boolean;
	/** Whether this object can be used as a connector endpoint target */
	connectable?: boolean;
	/**
	 * Declared by a titled region other objects sit inside (a VPC, a subsystem
	 * boundary). An automatic layout keeps the objects it holds inside it and sizes
	 * it to them, instead of moving it as one box among the others, and keeps
	 * `titleHeight` px below the top edge clear for the title band. Only a type whose
	 * `geometry` is `"rect"` is resized that way; any other is moved whole.
	 */
	container?: { titleHeight: number };
};

/** Boolean flag keys of ObjectFeatures (excludes the structural `type` / `geometry`). */
export type ObjectFeatureFlag = {
	[K in keyof ObjectFeatures]-?: ObjectFeatures[K] extends boolean | undefined
		? K
		: never;
}[keyof ObjectFeatures];

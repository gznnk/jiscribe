import type { GeometryType } from "./GeometryType";
import type { ObjectType } from "./ObjectType";

/**
 * Per-type declaration descriptor for canvas objects.
 * The flags control which feature interfaces are included in the generated
 * object types (Doc / State); `text` also picks between the two doc shapes.
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
	/** Text の形: "body" = 単一本文（doc はルート形）、"slots" = 名前付きスロット群（doc は keyed 形） */
	text?: "body" | "slots";
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

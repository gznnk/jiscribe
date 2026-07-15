import type { GeometryType } from "./GeometryType";
import type { ObjectType } from "./ObjectType";

/**
 * Per-type declaration descriptor for canvas objects.
 * The boolean flags control which feature interfaces are included in the
 * generated object types (Doc / State).
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
	/** Text content and styling */
	text?: boolean;
	/** Corner radius styling (for rect) */
	radius?: boolean;
	/** Arrowhead ends (startArrow / endArrow) */
	arrow?: boolean;
	/** Whether this object can be used as a connector endpoint target */
	connectable?: boolean;
	/** Whether this object has an independently-colorable header band (container) */
	header?: boolean;
};

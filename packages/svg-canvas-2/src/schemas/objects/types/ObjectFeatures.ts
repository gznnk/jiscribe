import type { GeometryType } from "./GeometryType";
import type { ObjectType } from "./ObjectType";

/**
 * Object features configuration for svg-canvas-2.
 * Controls which feature interfaces should be included in the object types.
 * Used for generating object document types based on their capabilities.
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
	/** Whether this object can be used as a connector endpoint target */
	connectable?: boolean;
};

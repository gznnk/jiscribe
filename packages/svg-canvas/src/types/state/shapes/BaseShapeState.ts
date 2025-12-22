import type { CreateStateType } from "./CreateStateType";
import type {
	BaseShapeData,
	BaseShapeFeatures,
} from "../../data/shapes/BaseShapeData";

/**
 * State type for base shape.
 * Contains properties for common interactive shape functionality.
 */
export type BaseShapeState = CreateStateType<
	BaseShapeData,
	typeof BaseShapeFeatures
>;
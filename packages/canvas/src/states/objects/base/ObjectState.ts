import type { MetaState } from "./MetaState";
import type { GeometryType } from "../../../schemas/objects/types/GeometryType";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

export type ObjectState = {
	id: string;
	type: ObjectType;
	/**
	 * ID of the parent group.
	 * Undefined if the object is at the root level (or is a top-level connector).
	 */
	parentId?: string;
	meta?: MetaState;
	/**
	 * Outline geometry kind (rect / ellipse / poly / none), stamped from the type's
	 * registered `ObjectFeatures.geometry` when the state is built via
	 * `ObjectMapperRegistry`. Lets pure consumers such as `adjustToOutline` resolve
	 * the outline shape from the object alone, without a registry lookup (#165).
	 * Optional because synthetic states (e.g. the multi-select group) are not built
	 * through a mapper; such objects are never connector-endpoint owners.
	 */
	geometry?: GeometryType;
};

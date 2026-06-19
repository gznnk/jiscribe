import type { MetaState } from "./MetaState";
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
};

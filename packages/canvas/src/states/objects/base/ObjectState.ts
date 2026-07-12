import type { MetaState } from "./MetaState";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
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
	 * The type's declaration descriptor, stamped by `ObjectMapperRegistry.toState`
	 * so consumers need no registry lookup (#165, #167).
	 * Invariant: always the registered const itself, never a copy — reference
	 * stability keeps memoized components from re-rendering. Re-stamp after
	 * deserialization (see handlePaste).
	 * Optional: synthetic states (e.g. the multi-select group) have none.
	 */
	features?: ObjectFeatures;
};

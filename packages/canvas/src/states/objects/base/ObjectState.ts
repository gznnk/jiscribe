import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { MetaState } from "./MetaState";

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
	/**
	 * True for a shape whose document states no `height`, its height following
	 * the text it holds instead (`supportsAutoHeight`). Set by the mapper from
	 * the absence of the field and read back by it, so the height stays out of
	 * the document; the height beside it is always a real number, derived from
	 * the text (`resizeAutoHeightStateToContent`) so every consumer measures a
	 * drawn box rather than a missing one.
	 *
	 * Only ever `true` or absent: "the document states one" is spelled by the
	 * absence, the way it is in the document itself.
	 */
	autoHeight?: true;
};

import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * Names the object the panel's threads hang off, for its header.
 *
 * @param obj - The comment target; its `meta.name` wins when it holds a non-blank string, and the shape type stands in otherwise
 * @returns The name to draw; never empty, since every object carries a type
 */
export const resolveCommentTargetLabel = (obj: ObjectState): string => {
	const name = obj.meta?.name;
	if (typeof name === "string" && name.trim() !== "") {
		return name;
	}
	return obj.type;
};

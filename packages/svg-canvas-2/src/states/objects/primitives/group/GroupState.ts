import type { Frame } from "@workspace/geometry";
import type { Prettify } from "@workspace/utility-types/src/Prettify";

import type { GroupFeatures } from "../../../../schemas/objects/primitives/GroupDoc";
import type { CreateObjectState } from "../../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GroupStateBrand: unique symbol;

export type GroupState = Prettify<
	CreateObjectState<
		typeof GroupFeatures,
		typeof GroupStateBrand,
		{
			/**
			 * List of child object IDs.
			 * The order in the array represents the rendering order (Z-index).
			 */
			childIds: string[];
		}
	> &
		Frame // Cached bounding frame (cx, cy, width, height) for performance
>;

/**
 * Type guard to check if an object is GroupState.
 *
 * @param obj - The object to check
 * @returns True if the object is GroupState, false otherwise
 */
export const isGroupState = (obj: unknown): obj is GroupState => {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"type" in obj &&
		obj.type === "group" &&
		"childIds" in obj &&
		Array.isArray(obj.childIds)
	);
};

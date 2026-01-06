import type { GroupFeatures } from "../../../schemas/objects/primitives/GroupDoc";
import type { CreateObjectState } from "../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GroupStateBrand: unique symbol;

export type GroupState = CreateObjectState<
	typeof GroupFeatures,
	typeof GroupStateBrand,
	{
		/**
		 * List of child object IDs.
		 * The order in the array represents the rendering order (Z-index).
		 */
		children: string[];
	}
>;

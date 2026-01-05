import type { GroupFeatures } from "../../../schemas/objects/primitives/GroupDoc";
import type { ObjectState } from "../base/ObjectState";
import type { CreateObjectState } from "../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GroupStateBrand: unique symbol;

export type GroupState = CreateObjectState<
	typeof GroupFeatures,
	typeof GroupStateBrand,
	{
		children: ObjectState[];
	}
>;

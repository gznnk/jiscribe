import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";
import type { ObjectDoc } from "../base/ObjectDoc";

export const GroupFeatures = {
	geometry: "none",
	transform: true,
} as const satisfies ObjectFeatures;

export type GroupDoc = CreateObjectType<
	typeof GroupFeatures,
	{
		type: "group";
		children: ObjectDoc[];
	}
>;

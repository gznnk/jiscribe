import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { CreateObjectType } from "../utils/CreateObjectType";

export const GroupFeatures = {
	geometry: "none",
	transform: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GroupDocBrand: unique symbol;

export type GroupDoc = CreateObjectType<
	typeof GroupFeatures,
	typeof GroupDocBrand,
	{
		type: "group";
		children: ObjectDoc[];
	}
>;

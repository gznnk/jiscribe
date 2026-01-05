import type { ArrowType } from "../types/ArrowType";
import type { ObjectFeatures } from "../types/ObjectFeatures";
import type { CreateObjectType } from "../utils/CreateObjectType";

export const ConnectorFeatures = {
	geometry: "poly",
	stroke: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ConnectorDocBrand: unique symbol;

export type ConnectorDoc = CreateObjectType<
	typeof ConnectorFeatures,
	typeof ConnectorDocBrand,
	{
		type: "connector";
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;

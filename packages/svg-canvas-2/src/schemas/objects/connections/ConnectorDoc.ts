import type { ArrowType } from "../../types/ArrowType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import type { CreateObjectType } from "../../utils/CreateObjectType";

export const ConnectorFeatures = {
	geometry: "poly",
	stroke: true,
} as const satisfies ObjectFeatures;

export type ConnectorDoc = CreateObjectType<
	typeof ConnectorFeatures,
	{
		type: "connector";
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;

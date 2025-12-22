import { isEnum } from "@workspace/validation";

import {
	ArrowHeadTypes,
	type ArrowHeadType,
} from "../../types/core/ArrowHeadType";

/**
 * Check if value is a valid ArrowHeadType.
 */
export const isArrowHeadType = isEnum(ArrowHeadTypes) as (
	value: unknown,
) => value is ArrowHeadType;

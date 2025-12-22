import { isEnum } from "@workspace/validation";

import {
	StrokeDashTypes,
	type StrokeDashType,
} from "../../types/core/StrokeDashType";

/**
 * Check if value is a valid StrokeDashType.
 */
export const isStrokeDashType = isEnum(StrokeDashTypes) as (
	value: unknown,
) => value is StrokeDashType;

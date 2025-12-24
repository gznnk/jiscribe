import { isEnum } from "@workspace/basic-validators";

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

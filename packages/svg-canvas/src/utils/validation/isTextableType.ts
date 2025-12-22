import { isEnum } from "@workspace/validation";

import {
	TextableTypes,
	type TextableType,
} from "../../types/core/TextableType";

/**
 * Check if value is a valid TextableType.
 */
export const isTextableType = isEnum(TextableTypes) as (
	value: unknown,
) => value is TextableType;

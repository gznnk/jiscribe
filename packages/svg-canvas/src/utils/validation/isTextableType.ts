import { isEnum } from "@workspace/basic-validators";

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

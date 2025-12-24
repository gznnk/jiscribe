import { isEnum } from "@workspace/basic-validators";

import { TextAlignValues, type TextAlign } from "../../types/core/TextAlign";

/**
 * Check if value is a valid TextAlign.
 */
export const isTextAlign = isEnum(TextAlignValues) as (
	value: unknown,
) => value is TextAlign;

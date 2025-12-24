import { isEnum } from "@workspace/basic-validators";

import {
	VerticalAlignValues,
	type VerticalAlign,
} from "../../types/core/VerticalAlign";

/**
 * Check if value is a valid VerticalAlign.
 */
export const isVerticalAlign = isEnum(VerticalAlignValues) as (
	value: unknown,
) => value is VerticalAlign;

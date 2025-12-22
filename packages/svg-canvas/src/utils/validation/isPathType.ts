import { isEnum } from "@workspace/validation";

import { PathTypes, type PathType } from "../../types/core/PathType";

/**
 * Check if value is a valid PathType.
 */
export const isPathType = isEnum(PathTypes) as (
	value: unknown,
) => value is PathType;

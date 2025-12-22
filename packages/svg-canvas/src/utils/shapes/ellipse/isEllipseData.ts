import type { EllipseData } from "../../../types/data/shapes/EllipseData";
import { EllipseFeatures } from "../../../types/data/shapes/EllipseData";
import { createValidatorFromTypeAndFeatures } from "../../validation/createValidatorFromTypeAndFeatures";

/**
 * Type guard to check if data is EllipseData.
 */
export const isEllipseData = createValidatorFromTypeAndFeatures(
	"Ellipse",
	EllipseFeatures,
) as (data: unknown) => data is EllipseData;

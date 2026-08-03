import type { SemanticDiagnostic } from "@workspace/canvas/doc";
import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import {
	BRACE_DIRECTIONS,
	BraceFeatures,
	isBraceDirection,
	isBraceTipPosition,
} from "./BraceDoc";

/** Validates the brace-specific `direction` / `tipPosition` (both optional). */
const validateBraceGeometry: ObjectDocValidateFn = (o, path) => {
	const errors: SemanticDiagnostic[] = [];
	if (o.direction !== undefined && !isBraceDirection(o.direction)) {
		errors.push({
			path: `${path}.direction`,
			message: `must be one of ${BRACE_DIRECTIONS.map((direction) => `"${direction}"`).join(" | ")}`,
		});
	}
	if (o.tipPosition !== undefined && !isBraceTipPosition(o.tipPosition)) {
		errors.push({
			path: `${path}.tipPosition`,
			message: "must be a number between 0 and 1",
		});
	}
	return errors;
};

/** Validates a BraceDoc (Frame-family shared logic + direction / tipPosition). */
export const validateBraceDoc: ObjectDocValidateFn = createFrameDocValidator(
	BraceFeatures,
	validateBraceGeometry,
);

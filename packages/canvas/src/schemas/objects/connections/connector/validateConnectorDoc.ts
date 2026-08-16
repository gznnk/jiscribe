import { isCssSafeValue, isNumber, isString } from "@jiscribe/basic-validators";

import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import type { SemanticDiagnostic } from "../../../types/SemanticDiagnostic";
import { isConnectorRouting } from "../../types/ConnectorRouting";
import { isOwnedEndpointRef } from "../../types/EndpointRef";
import { isStrokeDashType } from "../../types/StrokeDashType";
import {
	validateArrowFields,
	validateEndpointRef,
	validateOptionalNumber,
	validateStrokeStyleFields,
	validateWaypointFields,
} from "../../utils/validateDocUtils";

/**
 * Validates a connector's `label` (a nested annotation).
 * Unlike a shape body's TextStyleDoc, the fields are narrowed for a short tag placed on
 * the line (`text` required, placement `position`/`offset`, and only color/size/weight
 * styling). Unspecified (no key) is allowed as "no label". Kept alongside its caller
 * since it is connector-specific.
 */
function validateConnectorLabelFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	// Explicitly reject the mistake of writing a top-level `text` by confusing it with a shape's body text.
	const errors: SemanticDiagnostic[] = [];
	if ("text" in o) {
		errors.push({
			path: `${path}.text`,
			message:
				"connector has no top-level text; put the label in `label.text` instead.",
		});
	}

	if (!("label" in o) || o.label === undefined) {
		return errors;
	}

	const label = o.label;
	if (typeof label !== "object" || label === null) {
		return [...errors, { path: `${path}.label`, message: "must be an object" }];
	}

	const l = label as Record<string, unknown>;
	const labelPath = `${path}.label`;

	if (!isString(l.text)) {
		errors.push({ path: `${labelPath}.text`, message: "must be a string" });
	}
	if ("position" in l && l.position !== undefined) {
		if (!isNumber(l.position) || l.position < 0 || l.position > 1) {
			errors.push({
				path: `${labelPath}.position`,
				message: "must be a number between 0 and 1",
			});
		}
	}
	errors.push(...validateOptionalNumber(l, labelPath, "offset"));
	if ("fontColor" in l && !isCssSafeValue(l.fontColor)) {
		errors.push({
			path: `${labelPath}.fontColor`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	errors.push(...validateOptionalNumber(l, labelPath, "fontSize", 1));
	if ("fontWeight" in l && !isCssSafeValue(l.fontWeight)) {
		errors.push({
			path: `${labelPath}.fontWeight`,
			message: "must be a safe CSS font-weight value",
			beyondSchema: true,
		});
	}
	// Background (fill) and border (stroke color + strokeWidth). Same vocabulary as shapes.
	if ("fill" in l && !isCssSafeValue(l.fill)) {
		errors.push({
			path: `${labelPath}.fill`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	if ("stroke" in l && !isCssSafeValue(l.stroke)) {
		errors.push({
			path: `${labelPath}.stroke`,
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}
	errors.push(...validateOptionalNumber(l, labelPath, "strokeWidth", 0));
	if ("strokeDashType" in l && !isStrokeDashType(l.strokeDashType)) {
		errors.push({
			path: `${labelPath}.strokeDashType`,
			message: "must be one of: solid, dashed, dotted",
		});
	}
	return errors;
}

/**
 * Validates a ConnectorDoc: waypoints, stroke style, arrows, label, both endpoints,
 * optional routing, and the invariant that at least one endpoint is owned.
 * `points` holds only intermediate waypoints (endpoints live on source/target), so an
 * empty array is allowed.
 */
export const validateConnectorDoc: ObjectDocValidateFn = (o, path) => [
	...validateWaypointFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
	...validateConnectorLabelFields(o, path),
	...validateEndpointRef(o.source, `${path}.source`),
	...validateEndpointRef(o.target, `${path}.target`),
	// routing is optional; if specified, only known values are allowed.
	...("routing" in o &&
	o.routing !== undefined &&
	!isConnectorRouting(o.routing)
		? [
				{
					path: `${path}.routing`,
					message: `connector.routing must be one of "straight" | "orthogonal".`,
					...(typeof o.id === "string" ? { id: o.id } : {}),
				},
			]
		: []),
	// Invariant: a connector must have at least one owned endpoint.
	// Both endpoints free (no owner) is equivalent to ink(polyline) and invalid as a connector.
	...(!isOwnedEndpointRef(o.source) && !isOwnedEndpointRef(o.target)
		? [
				{
					path,
					message:
						"connector must have at least one owned endpoint (both endpoints are free).",
					// This rule is also expressed in the JSON schema (ConnectorDoc's not constraint),
					// so beyondSchema is not attached (leave the extension to the schema as a structural
					// error to avoid double-reporting).
					// It is kept in the validator as well for the webview / MCP that have no schema.
					...(typeof o.id === "string" ? { id: o.id } : {}),
				},
			]
		: []),
];

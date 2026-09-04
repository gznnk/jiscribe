import type { ConnectorLabel } from "./ConnectorDoc";
import type { ObjectDocValidateFn } from "../../../plugin/ObjectDocValidatorRegistry";
import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import { STROKE_WIDTH_MIN } from "../base/StrokeStyleDoc";
import { isConnectorRouting } from "../types/ConnectorRouting";
import { isOwnedEndpointRef } from "../types/EndpointRef";
import { FONT_SIZE_MIN } from "../types/RichText";
import { isStrokeDashType } from "../types/StrokeDashType";
import type { DocFieldValidator } from "../utils/validateDocUtils";
import {
	colorValidator,
	cssValueValidator,
	enumValidator,
	numberRangeValidator,
	numberValidator,
	stringValidator,
	validateArrowFields,
	validateEndpointRef,
	validateFields,
	validateStrokeStyleFields,
	validateWaypointFields,
} from "../utils/validateDocUtils";

/**
 * The label's optional fields, in the order the diagnostics come out in.
 * `text` is left out: it is required, which a table checking only the fields
 * that are there cannot say. The state layer keys a table of its own by the
 * same type, so a field the label gains has to be given a validator on both
 * sides or fails to compile on both (validateConnectorState).
 */
const connectorLabelValidators = {
	position: numberRangeValidator(0, 1),
	// A signed distance from the path, bounded at neither end.
	offset: numberValidator(),
	fontColor: colorValidator,
	fontFamily: cssValueValidator("font-family"),
	fontSize: numberValidator(FONT_SIZE_MIN),
	fontWeight: cssValueValidator("font-weight"),
	// Background (fill) and border (stroke color + strokeWidth). Same vocabulary as shapes.
	fill: colorValidator,
	stroke: colorValidator,
	strokeWidth: numberValidator(STROKE_WIDTH_MIN),
	strokeDashType: enumValidator(
		isStrokeDashType,
		"must be one of: solid, dashed, dotted",
	),
} as const satisfies Record<
	keyof Omit<ConnectorLabel, "text">,
	DocFieldValidator
>;

/**
 * Validates a connector's `label` (a nested annotation).
 * Unlike a shape body's TextStyleDoc, the fields are narrowed for a short tag placed on
 * the line (`text` required, placement `position`/`offset`, and only color/family/size/weight
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

	// The only required field, so it is checked outside the table rather than in it.
	errors.push(...stringValidator(l.text, `${labelPath}.text`));
	errors.push(...validateFields(l, labelPath, connectorLabelValidators));
	return errors;
}

/**
 * Requires an endpoint to be present before the per-ref checks. `validateEndpointRef`
 * deliberately no-ops on a non-object, so without this gate a connector missing
 * `source` entirely (or carrying e.g. `source: 5`) would validate clean, while
 * `ConnectorState.source` is required — the doc would crash downstream in the
 * schema-less consumers (webview / MCP) this validator stands alone for. Mirrors
 * the `isObject` guard in the State-side `isValidConnectorState` and the JSON
 * schema's `required: ["source", "target"]`.
 */
function validateRequiredEndpointRef(
	ref: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (typeof ref !== "object" || ref === null) {
		return [{ path, message: "must be an object" }];
	}
	return validateEndpointRef(ref, path);
}

/**
 * Validates a ConnectorDoc: waypoints, stroke style, arrows, label, both endpoints
 * (each required to be present), optional routing, and the invariant that at least
 * one endpoint is owned.
 * `points` holds only intermediate waypoints (endpoints live on source/target), so an
 * empty array is allowed.
 */
export const validateConnectorDoc: ObjectDocValidateFn = (o, path) => [
	...validateWaypointFields(o, path),
	...validateStrokeStyleFields(o, path),
	...validateArrowFields(o, path),
	...validateConnectorLabelFields(o, path),
	...validateRequiredEndpointRef(o.source, `${path}.source`),
	...validateRequiredEndpointRef(o.target, `${path}.target`),
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

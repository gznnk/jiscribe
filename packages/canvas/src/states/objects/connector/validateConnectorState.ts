import {
	isCssSafeValue,
	isNumber,
	isObject,
	isString,
} from "@jiscribe/basic-validators";
import { STROKE_WIDTH_MIN } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { isConnectorRouting } from "@jiscribe/doc/model/objects/types/ConnectorRouting";
import { FONT_SIZE_MIN } from "@jiscribe/doc/model/objects/types/RichText";
import { isStrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";

import type { ObjectStateValidator } from "../../registry/ObjectStateValidatorRegistry";
import { createPolyStateValidator } from "../utils/createPolyStateValidator";
import {
	hasOwnedEndpoint,
	hasValidFields,
	isValidColorValue,
	isValidEndpointRefState,
	numberRangeValidator,
	numberValidator,
	type StateFieldValidator,
	type StateRecord,
} from "../utils/validateStateUtils";

/**
 * The label's optional fields, keyed by the very type the Doc-side table is
 * (validateConnectorDoc), so a field the label gains has to be given a check on
 * both sides or fails to compile on both. `text` is left out: it is required,
 * which a table checking only the fields that are there cannot say.
 *
 * Colors are the one place this is tighter than the Doc side rather than equal:
 * `isValidColorValue` also asks whether the value is a color, which the Doc side
 * cannot (it runs in Node too). Tighter is safe here — it can only refuse a
 * paste, never produce a doc that fails.
 */
const connectorLabelValidators = {
	// position is a 0..1 fraction along the line (schema range).
	position: numberRangeValidator(0, 1),
	offset: isNumber,
	fontColor: isValidColorValue,
	fontFamily: isCssSafeValue,
	fontSize: numberValidator(FONT_SIZE_MIN),
	fontWeight: isCssSafeValue,
	fill: isValidColorValue,
	stroke: isValidColorValue,
	strokeWidth: numberValidator(STROKE_WIDTH_MIN),
	strokeDashType: isStrokeDashType,
} as const satisfies Record<
	keyof Omit<ConnectorLabel, "text">,
	StateFieldValidator
>;

/**
 * Validates the structure of `label` (a nested annotation). Omitting it is
 * allowed and treated as no label. `text` is a required string; position and
 * style fields are type-checked only when present.
 *
 * Every field is held as strictly as the Doc side holds it, or more: this is the
 * clipboard boundary, so anything it accepts must also survive re-parse. A looser check
 * (plain `isString` on colors, unbounded `position`) would let a pasted label carry
 * `stroke: "red;}…"` (CSS injection) or `position: 5` through `commit`, producing a
 * `.jis.json` that fails the Doc validator on the next open.
 */
export const isValidConnectorLabelState = (label: unknown): boolean => {
	if (label === undefined) {
		return true;
	}
	if (!isObject(label)) {
		return false;
	}
	const l = label as StateRecord;
	return isString(l.text) && hasValidFields(l, connectorLabelValidators);
};

/**
 * Connector-specific checks beyond the feature-driven groups: optional routing,
 * the label, and both endpoints (present objects, valid refs, at least one owned).
 */
const isValidConnectorExtras = (o: StateRecord): boolean =>
	// routing is optional. When specified, only known values (straight | orthogonal) are allowed.
	(o.routing === undefined || isConnectorRouting(o.routing)) &&
	isValidConnectorLabelState(o.label) &&
	isObject(o.source) &&
	isObject(o.target) &&
	isValidEndpointRefState(o.source) &&
	isValidEndpointRefState(o.target) &&
	hasOwnedEndpoint(o.source, o.target);

/**
 * Validates a ConnectorState (Poly-family common logic generated from features,
 * plus the connector extras above). `points` holds only intermediate waypoints
 * while the endpoints are held by source/target, so an empty array is allowed
 * (minPoints 0, corresponding to the Doc-side `validateWaypointFields`); the
 * invariant requires at least one of the endpoints to be owned.
 */
export const isValidConnectorState: ObjectStateValidator =
	createPolyStateValidator(ConnectorFeatures, 0, isValidConnectorExtras);

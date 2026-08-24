import {
	isCssSafeValue,
	isNumber,
	isObject,
	isString,
} from "@jiscribe/basic-validators";
import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { isConnectorRouting } from "@jiscribe/doc/model/objects/types/ConnectorRouting";
import { isStrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";

import type { ObjectStateValidator } from "../../registry/ObjectStateValidatorRegistry";
import { createPolyStateValidator } from "../utils/createPolyStateValidator";
import {
	hasOwnedEndpoint,
	isValidEndpointRefState,
	type StateRecord,
} from "../utils/validateStateUtils";

/**
 * Validates the structure of `label` (a nested annotation). Omitting it is
 * allowed and treated as no label. `text` is a required string; position and
 * style fields are type-checked only when present.
 *
 * The constraints mirror the Doc-side `validateConnectorLabelFields` exactly: this
 * is the clipboard boundary, so anything it accepts must also survive re-parse. A
 * looser check here (plain `isString` on colors, unbounded `position`) would let a
 * pasted label carry `stroke: "red;}…"` (CSS injection) or `position: 5` through
 * `commit`, producing a `.jis.json` that fails the Doc validator on the next open.
 */
export const isValidConnectorLabelState = (label: unknown): boolean => {
	if (label === undefined) {
		return true;
	}
	if (!isObject(label)) {
		return false;
	}
	const l = label as StateRecord;
	return (
		isString(l.text) &&
		// position is a 0..1 fraction along the line (schema range).
		(l.position === undefined ||
			(isNumber(l.position) && l.position >= 0 && l.position <= 1)) &&
		(l.offset === undefined || isNumber(l.offset)) &&
		// Style strings must be CSS-injection-safe, not merely strings.
		(l.fontColor === undefined || isCssSafeValue(l.fontColor)) &&
		(l.fontFamily === undefined || isCssSafeValue(l.fontFamily)) &&
		// fontSize has minimum: 1 in the schema.
		(l.fontSize === undefined || (isNumber(l.fontSize) && l.fontSize >= 1)) &&
		(l.fontWeight === undefined || isCssSafeValue(l.fontWeight)) &&
		(l.fill === undefined || isCssSafeValue(l.fill)) &&
		(l.stroke === undefined || isCssSafeValue(l.stroke)) &&
		// strokeWidth has minimum: 0 in the schema.
		(l.strokeWidth === undefined ||
			(isNumber(l.strokeWidth) && l.strokeWidth >= 0)) &&
		(l.strokeDashType === undefined || isStrokeDashType(l.strokeDashType))
	);
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

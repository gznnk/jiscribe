import type {
	ObjectGeometryKeyCalculator,
	ObjectState,
} from "@workspace/canvas";

import {
	resolveGroupMarkerDirection,
	resolveGroupMarkerTipPosition,
} from "./groupMarkerGeometry";
import type { GroupMarkerTipFields } from "../../schema/shared/GroupMarkerFields";

/**
 * The two fields that move the tip without touching the frame — the tip drag and
 * re-facing the marker — so a connector attached to the `tip` connection point
 * (calcGroupMarkerConnectPoints) is re-resolved as the tip moves. Resolved through
 * the same defaults as the point itself, so an absent field and an explicit
 * default share one key.
 */
export const groupMarkerGeometryKey: ObjectGeometryKeyCalculator<
	ObjectState & GroupMarkerTipFields
> = (state) =>
	`${resolveGroupMarkerDirection(state)}:${resolveGroupMarkerTipPosition(state)}`;

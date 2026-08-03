import type { ObjectState } from "@workspace/canvas";
import type { TransformedFrame } from "@workspace/geometry";

import type {
	GroupMarkerDirectionField,
	GroupMarkerTipPositionField,
} from "../../schema/shared/GroupMarkerFields";

/**
 * What the shared tip control and its handlers read off a group marker: the
 * placed box plus the two fields the markers add. Written structurally rather
 * than as a union of the three states, so a control registered on one type
 * still type-checks against that type's own state.
 */
export type GroupMarkerControlState = ObjectState &
	TransformedFrame &
	GroupMarkerDirectionField &
	GroupMarkerTipPositionField;

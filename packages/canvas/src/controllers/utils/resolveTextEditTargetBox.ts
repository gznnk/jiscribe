import type { BoundingBox } from "@workspace/geometry";

import { collectConnectorPoints } from "./calcConnectorBoundingBox";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import { calcConnectorLabelAnchor } from "../../presentations/layers/content/utils/label/calcConnectorLabelAnchor";
import type { ConnectorLabelPlacement } from "../../presentations/layers/content/utils/label/calcConnectorLabelPlacement";
import { resolveConnectorLabelBox } from "../../presentations/objects/connections/ConnectorLabel/utils/connectorLabelLayout";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import { isConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Box the label editor covers: the label's own size around the anchor it is
 * centered on, never the connector's route. Sized from the draft text through
 * the same derivation the renderer and the editor use, so it follows the
 * keystroke that is widening it.
 */
const calcEditedLabelBox = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
	text: string,
	placement: ConnectorLabelPlacement | undefined,
	fontFamily: string,
): BoundingBox | null => {
	const points = collectConnectorPoints(connector, objects);
	if (!points) {
		return null;
	}

	const anchor = calcConnectorLabelAnchor(
		points,
		placement?.position ?? connector.label?.position,
		placement?.offset ?? connector.label?.offset,
	);
	if (!anchor) {
		return null;
	}

	const { width, height } = resolveConnectorLabelBox(
		{ ...connector.label, text },
		fontFamily,
	);
	return {
		left: anchor.x - width / 2,
		top: anchor.y - height / 2,
		right: anchor.x + width / 2,
		bottom: anchor.y + height / 2,
	};
};

/**
 * Axis-aligned world box the active text editor sits on, for both editing kinds.
 *
 * A shape yields its own bounding box (rotation included), which is where its
 * editor is overlaid and which the editor never grows past. A connector label
 * yields the label box alone — the route it rides on can be arbitrarily long,
 * and revealing that would pan far away from what is being typed.
 *
 * @param textEditState - The active editing session; null (not editing) yields null
 * @param objects - Objects to read the target from. Pass the draft map
 *   (`graftTextEditDraft`), or a box measured from its text lags a keystroke behind
 * @param fontFamily - Family the host draws unstyled text in
 *   (`docDefaults.fontFamily`), used to measure a connector label
 * @returns The box in world coordinates, or null when there is no target to
 *   reveal (not editing, target removed, unresolvable connector route)
 */
export const resolveTextEditTargetBox = (
	textEditState: CanvasControllerState["textEditState"],
	objects: Record<string, ObjectState>,
	fontFamily: string,
): BoundingBox | null => {
	if (!textEditState) {
		return null;
	}

	const target = objects[textEditState.objectId];
	if (!target) {
		return null;
	}

	if (textEditState.kind === "connectorLabel") {
		return isConnectorState(target)
			? calcEditedLabelBox(
					target,
					objects,
					textEditState.text,
					textEditState.placement,
					fontFamily,
				)
			: null;
	}

	return calcObjectBoundingBox(target, objects);
};

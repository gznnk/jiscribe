import type { ObjectPartSelection } from "../../CanvasSelection";
import {
	CONNECTOR_LABEL_PART_ID,
	CONNECTOR_LABEL_PART_KIND,
} from "../../partKinds/connectorLabelPartKind";

/**
 * The part selection a click on a connector's label box writes
 * (ConnectorClickHandler): one collapsed range over the label's one id.
 *
 * @returns A part selection to put in `CanvasSelection.part`
 */
export const connectorLabelPartSelection = (): ObjectPartSelection => ({
	kind: CONNECTOR_LABEL_PART_KIND,
	ranges: [
		{ anchorId: CONNECTOR_LABEL_PART_ID, focusId: CONNECTOR_LABEL_PART_ID },
	],
});

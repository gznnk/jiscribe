import type { ObjectPartKindDefinition } from "../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import { CONNECTOR_STYLE_TABLE } from "../../style/tables/connectorStyleTable";
import { clearConnectorLabel } from "../../utils/clearConnectorLabel";
import type { ObjectPartSelection } from "../CanvasSelection";

/**
 * The part-id namespace of a connector's label. The same word as the text edit
 * draft's `kind` for a label session, but a separate namespace: a draft is not
 * a pick, and neither is compared against the other's constant.
 */
export const CONNECTOR_LABEL_PART_KIND = "connectorLabel";

/** The one id the namespace holds: a connector carries at most one label. */
export const CONNECTOR_LABEL_PART_ID = "label";

/** The style intent kinds that write the label rather than the line: every `label.*` row of the connector's style table. */
const CONNECTOR_LABEL_STYLE_INTENT_KINDS: ReadonlySet<string> = new Set(
	Object.keys(CONNECTOR_STYLE_TABLE).filter((styleIntentKind) =>
		styleIntentKind.startsWith("label."),
	),
);

/**
 * Whether what is picked one level below the object is a connector's label.
 *
 * @param part - The parts picked one level below the object
 *   (`CanvasSelection.part`), taken as it stands (the reducer has already
 *   dropped one naming a label that is gone, reconcileSelection); null when
 *   none are
 * @returns True only while the label is picked; false when nothing is picked
 *   below the connector, or what is picked is a vertex
 */
export const isConnectorLabelPart = (
	part: ObjectPartSelection | null,
): part is ObjectPartSelection =>
	part !== null && part.kind === CONNECTOR_LABEL_PART_KIND;

/**
 * The `connectorLabel` part definition the connector type registers: its label
 * as one part, under {@link CONNECTOR_LABEL_PART_ID}. A pick of it receives the
 * label's style kinds alone, and Delete takes the label away the way emptying
 * it in the editor does (clearConnectorLabel).
 *
 * No `region`: the label's box follows from the resolved path, which takes
 * other objects and the registries, not from the connector alone. The outline
 * is drawn by the connector's own controls instead (ConnectorControls).
 *
 * @returns A definition to put in the connector's `ObjectTypeDefinition.partKinds`
 */
export const createConnectorLabelPartKindDefinition =
	(): ObjectPartKindDefinition<ConnectorState> => ({
		kind: CONNECTOR_LABEL_PART_KIND,

		// An emptied label kept for its styles draws no box, so it is no part to pick.
		has: (connector, partId) =>
			partId === CONNECTOR_LABEL_PART_ID &&
			connector.label !== undefined &&
			connector.label.text !== "",

		styleIntentKinds: CONNECTOR_LABEL_STYLE_INTENT_KINDS,

		delete: (connector) => ({ object: clearConnectorLabel(connector) }),
	});

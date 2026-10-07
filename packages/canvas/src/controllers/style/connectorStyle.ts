import { fieldEntry } from "./entries/fieldEntry";
import type { StyleTable } from "./StyleEntry";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";

/**
 * What a connector answers for beyond its features: the box and the typography
 * of its label, which no `ObjectFeatures` flag speaks for — the label is a text
 * box the type carries under `label`, not the body text a `features.text` type
 * holds.
 *
 * Each kind lands through the nested path its name spells, so a connector with
 * no label takes none of them (fieldEntry merges into an existing parent and
 * never fabricates one). Handed to the type through `ObjectTypeDefinition.style`
 * (applyObjectDefinition) and read through by the rows that state these values —
 * the ObjectMenu's LabelStyleMenu and the sidebar's ConnectorLabelItems — so one
 * declaration types the write and the read alike.
 */
export const CONNECTOR_STYLE = {
	"label.fill": fieldEntry("label.fill", "string"),
	"label.stroke": fieldEntry("label.stroke", "string"),
	"label.strokeWidth": fieldEntry("label.strokeWidth", "number"),
	"label.strokeDashType": fieldEntry("label.strokeDashType", "string"),
	"label.fontColor": fieldEntry("label.fontColor", "string"),
	"label.fontFamily": fieldEntry("label.fontFamily", "string"),
	"label.fontSize": fieldEntry("label.fontSize", "number"),
	"label.fontWeight": fieldEntry("label.fontWeight", "string"),
} satisfies StyleTable<ConnectorState>;

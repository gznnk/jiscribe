import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import { declaredFieldEntry } from "../entries/declaredFieldEntry";
import type { DeclaredStyleTable } from "../StyleEntry";

/**
 * What a connector answers for beyond its features: the box and the typography
 * of its label, which no `ObjectFeatures` flag speaks for — the label is a text
 * box the type carries under `label`, not the body text a `features.text` type
 * holds.
 *
 * Each kind lands through the nested path its name spells, so a connector with
 * no label takes none of them (declaredFieldEntry merges into an existing
 * parent and never fabricates one). Handed to the type through
 * `ObjectTypeDefinition.styleEntries` (applyObjectDefinition) and read through
 * by the rows that state these values — the ObjectMenu's LabelStyleMenu and
 * the sidebar's ConnectorLabelItems — so one declaration types the write and
 * the read alike.
 */
export const CONNECTOR_STYLE_TABLE = {
	"label.fill": declaredFieldEntry("label.fill", "string"),
	"label.stroke": declaredFieldEntry("label.stroke", "string"),
	"label.strokeWidth": declaredFieldEntry("label.strokeWidth", "number"),
	"label.strokeDashType": declaredFieldEntry("label.strokeDashType", "string"),
	"label.fontColor": declaredFieldEntry("label.fontColor", "string"),
	"label.fontFamily": declaredFieldEntry("label.fontFamily", "string"),
	"label.fontSize": declaredFieldEntry("label.fontSize", "number"),
	"label.fontWeight": declaredFieldEntry("label.fontWeight", "string"),
} satisfies DeclaredStyleTable<ConnectorState>;

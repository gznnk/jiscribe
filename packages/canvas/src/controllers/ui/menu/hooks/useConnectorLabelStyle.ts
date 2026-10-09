import type { CanvasControllerState } from "../../../CanvasTypes";
import { CONNECTOR_STYLE_ENTRIES } from "../../../style/connectorStyleEntries";
import { useSelectionStyle } from "../../../style/SelectionStyleReaderContext";
import { selectionValueOr } from "../../../style/SelectionValue";
import type { StyleEntryValueType } from "../../../style/StyleEntry";
import { hasSelectedConnectorLabelText } from "../../../utils/hasSelectedConnectorLabelText";

/** What one row of a connector's label sections needs before it draws itself. */
type ConnectorLabelStyle<TValue> = {
	/** The value to draw: the one the label carries, or the row's fallback. */
	value: TValue;
	/** Whether there is a label to style at all; false means the row draws nothing. */
	hasLabelText: boolean;
};

/**
 * One `label.*` property of the selected connector, together with the answer to
 * whether the row stating it should be drawn — the pair every row of both
 * surfaces' label sections needs (LabelStyleMenu, ConnectorLabelItems).
 *
 * The presence of the label is handed back as a value rather than guarded here,
 * so a row reads before it returns and its hook order holds whichever way the
 * guard goes.
 *
 * @param kind - The property to read, as the connector declares it (CONNECTOR_STYLE_ENTRIES), which types the value
 * @param fallback - Drawn where the selection states no value of its own; usually what an unset property is drawn with
 * @param selection - The slice the row is handed (`{ objects, selection }`); anything but a lone connector carrying label text answers `hasLabelText: false`
 * @returns The value to draw and whether to draw the row
 */
export const useConnectorLabelStyle = <
	TKind extends keyof typeof CONNECTOR_STYLE_ENTRIES,
	TFallback,
>(
	kind: TKind,
	fallback: TFallback,
	selection: Pick<CanvasControllerState, "objects" | "selection">,
): ConnectorLabelStyle<
	| Exclude<
			StyleEntryValueType<(typeof CONNECTOR_STYLE_ENTRIES)[TKind]>,
			undefined
	  >
	| TFallback
> => ({
	value: selectionValueOr(
		useSelectionStyle(CONNECTOR_STYLE_ENTRIES, kind),
		fallback,
	),
	hasLabelText: hasSelectedConnectorLabelText(selection),
});

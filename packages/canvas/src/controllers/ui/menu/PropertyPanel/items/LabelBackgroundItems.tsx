import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { useCanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesContext";
import { useDocumentSurface } from "../../../../../rendering/objects/DocumentSurfaceContext";
import { resolveLabelFill } from "../../../../../rendering/objects/utils/resolveLabelFill";
import { useMemoAcrossMoveDrag } from "../../../../hooks/useMemoAcrossMoveDrag";
import type { SelectionValue } from "../../../../style/SelectionValue";
import {
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
} from "../../../../style/SelectionValue";
import { CONNECTOR_STYLE_TABLE } from "../../../../style/tables/connectorStyleTable";
import { hasSelectedConnectorLabelText } from "../../../../utils/hasSelectedConnectorLabelText";
import { hasSelectedLabelText } from "../../../../utils/hasSelectedLabelText";
import type { StyleIntentUpdater } from "../../ObjectMenu/ObjectMenuTypes";
import { useSelectionStyle } from "../../SelectionStyleReaderContext";
import { PropertyColorField } from "../common/PropertyColorField";
import { PropertyRow } from "../common/PropertyRow";
import type { PropertyPanelItemProps } from "../PropertyPanelTypes";

type LabelBackgroundRowProps = {
	/** Where the color lands: a connector label's `label.fill`, or a `text: "label"` caption's `labelFill`. */
	property: "label.fill" | "labelFill";
	/** What the selection states for `property`, an unset one reading as undefined or `"auto"`. */
	fill: SelectionValue<string | undefined>;
	/** Whether the selection holds a label to paint; false draws nothing. */
	hasLabelText: boolean;
	onStyleIntent: StyleIntentUpdater;
};

/**
 * The face of a label's box, for whichever label `property` names. Unset it
 * knocks out what lies behind with the page's color rather than with a color of
 * its own, so its swatch is what resolveLabelFill gives rather than the
 * `canvas` role's theme color. The swatch leaves out the fills of the frames a
 * label lies on, which differ from one label of a selection to the next.
 */
const LabelBackgroundRowComponent: React.FC<LabelBackgroundRowProps> = ({
	property,
	fill,
	hasLabelText,
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const documentSurface = useDocumentSurface();

	if (!hasLabelText) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowBackground}>
			<PropertyColorField
				value={selectionValueOr(fill, AUTO_COLOR)}
				mixedValues={selectionMixedValues(fill)?.map(
					(mixedColor) => mixedColor ?? AUTO_COLOR,
				)}
				property={property}
				role="canvas"
				autoSwatchColor={resolveLabelFill(undefined, documentSurface)}
				// Not mixed means every label the selection reaches was read.
				currentColorIsShared={!isMixedSelectionValue(fill)}
				title={messages.menuLabelBackgroundColor}
				onStyleIntent={onStyleIntent}
			/>
		</PropertyRow>
	);
};

const LabelBackgroundRow = memo(LabelBackgroundRowComponent);

/** The selected connector's label background (`label.fill`), a row of its Label section. */
const ConnectorLabelBackgroundItemComponent: React.FC<
	PropertyPanelItemProps
> = ({ objects, selection, onStyleIntent }) => (
	<LabelBackgroundRow
		property="label.fill"
		fill={useSelectionStyle(CONNECTOR_STYLE_TABLE, "label.fill")}
		hasLabelText={hasSelectedConnectorLabelText({ objects, selection })}
		onStyleIntent={onStyleIntent}
	/>
);

export const ConnectorLabelBackgroundItem = memo(
	ConnectorLabelBackgroundItemComponent,
);

/**
 * The background of the selected `text: "label"` captions (`labelFill`), the
 * `labelBackgroundColor` built-in row. Drawn while any caption the selection
 * reaches has text.
 */
const LabelFillItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onStyleIntent,
}) => (
	<LabelBackgroundRow
		property="labelFill"
		fill={useSelectionStyle("labelFill")}
		// Walks the selected groups' descendants, so a move drag reuses the answer.
		hasLabelText={useMemoAcrossMoveDrag(
			canvasState,
			() => hasSelectedLabelText(canvasState),
			[canvasState.selection],
		)}
		onStyleIntent={onStyleIntent}
	/>
);

export const LabelFillItem = memo(LabelFillItemComponent);

/**
 * The rows of the connector's Label and Label border sections: the text and the
 * box a label is drawn in, stated one property at a time under `label.*`.
 *
 * Every row returns null while the selected connector carries no label text —
 * there is nothing to style until a label exists — and the sections' own
 * `isShown` takes their headings away with them (see initializeObjectRegistry).
 * The two sections are the sidebar twin of the ObjectMenu's LabelStyleMenu,
 * which splits the same properties across two sections of icons.
 */

import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo } from "react";

import { CONNECTOR_LABEL_DEFAULTS } from "../../../../../rendering/objects/connector/ConnectorLabel";
import { setPart } from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { getSelectedConnectorLabel } from "../../../../utils/getSelectedConnectorLabel";
import { isBoldFontWeight } from "../../../../utils/isBoldFontWeight";
import { BoldIcon } from "../../../icons/BoldIcon";
import { DashedLineIcon } from "../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../icons/DottedLineIcon";
import { SolidLineIcon } from "../../../icons/SolidLineIcon";
import {
	ObjectMenuFontFamilyList,
	usePreviewFonts,
} from "../../ObjectMenu/common/ObjectMenuFontFamilyList";
import { PropertyColorField } from "../common/PropertyColorField";
import { PropertyDropdownTriggerLabel } from "../common/PropertyControlsStyled";
import { PropertyDropdownField } from "../common/PropertyDropdownField";
import { PropertyNumberField } from "../common/PropertyNumberField";
import { PropertyRow } from "../common/PropertyRow";
import { PropertySegmentedControl } from "../common/PropertySegmentedControl";
import type { PropertyPanelItemProps } from "../PropertyPanelTypes";
import { resolveFontFamilyLabel } from "../utils/resolveFontFamilyLabel";

const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 999;

const MIN_BORDER_WIDTH = 0;
const MAX_BORDER_WIDTH = 12;

/** The dash an unset label border is drawn with, and so the one the row lights. */
const DEFAULT_STROKE_DASH_TYPE = "solid";

/** The face the label's text is drawn in, picked from the shipped set. */
const ConnectorLabelFontFamilyItemComponent: React.FC<
	PropertyPanelItemProps
> = ({ objects, selectedConnectorId }) => {
	const messages = useCanvasMessages();
	usePreviewFonts(messages);
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	// Early-return only after all hooks have been called (to keep hook order stable).
	if (!label?.text) {
		return null;
	}

	// An unset family draws in the default one, so that is the entry to mark active.
	const fontFamily = label.fontFamily ?? CONNECTOR_LABEL_DEFAULTS.fontFamily;

	return (
		<PropertyRow label={messages.menuFontFamily}>
			<PropertyDropdownField
				title={messages.menuLabelFontFamily}
				preview={
					<PropertyDropdownTriggerLabel style={{ fontFamily }}>
						{resolveFontFamilyLabel(fontFamily, messages)}
					</PropertyDropdownTriggerLabel>
				}
			>
				<ObjectMenuFontFamilyList
					activeFontFamily={fontFamily}
					property="label.fontFamily"
				/>
			</PropertyDropdownField>
		</PropertyRow>
	);
};

export const ConnectorLabelFontFamilyItem = memo(
	ConnectorLabelFontFamilyItemComponent,
);

/** How large the label's text is drawn. */
const ConnectorLabelFontSizeItemComponent: React.FC<PropertyPanelItemProps> = ({
	objects,
	selectedConnectorId,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	if (!label?.text) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowSize}>
			<PropertyNumberField
				value={label.fontSize ?? CONNECTOR_LABEL_DEFAULTS.fontSize}
				min={MIN_FONT_SIZE}
				max={MAX_FONT_SIZE}
				ariaLabel={messages.menuLabelFontSize}
				testId="property-field:label.fontSize"
				onUpdate={(value, commit, coalesceHistory) =>
					onPropertyUpdate(
						"label.fontSize",
						String(value),
						commit,
						coalesceHistory,
					)
				}
			/>
		</PropertyRow>
	);
};

export const ConnectorLabelFontSizeItem = memo(
	ConnectorLabelFontSizeItemComponent,
);

/** The ink the label's text is drawn in. */
const ConnectorLabelFontColorItemComponent: React.FC<
	PropertyPanelItemProps
> = ({ objects, selectedConnectorId, onPropertyUpdate }) => {
	const messages = useCanvasMessages();
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	if (!label?.text) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<PropertyColorField
				value={label.fontColor ?? AUTO_COLOR}
				property="label.fontColor"
				role="ink"
				title={messages.menuLabelFontColor}
				onPropertyUpdate={onPropertyUpdate}
			/>
		</PropertyRow>
	);
};

export const ConnectorLabelFontColorItem = memo(
	ConnectorLabelFontColorItemComponent,
);

/**
 * Bold alone: the label has no italic, underline or strikethrough of its own,
 * so the row holds the one segment the shapes' Style row starts with.
 */
const ConnectorLabelStyleItemComponent: React.FC<PropertyPanelItemProps> = ({
	objects,
	selectedConnectorId,
}) => {
	const messages = useCanvasMessages();
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	if (!label?.text) {
		return null;
	}

	const isBold = isBoldFontWeight(label.fontWeight);

	return (
		<PropertyRow label={messages.propertyPanelRowStyle}>
			<PropertySegmentedControl
				options={[
					{
						id: "bold",
						part: setPart("label.fontWeight", isBold ? "normal" : "bold"),
						title: messages.menuLabelBold,
						content: <BoldIcon title={messages.menuLabelBold} />,
						isActive: isBold,
					},
				]}
			/>
		</PropertyRow>
	);
};

export const ConnectorLabelStyleItem = memo(ConnectorLabelStyleItemComponent);

/**
 * The face of the label's box. Unset it knocks the line out with the canvas
 * surface color rather than with a color of its own (resolveLabelFill), which is
 * the `canvas` role's swatch.
 */
const ConnectorLabelBackgroundItemComponent: React.FC<
	PropertyPanelItemProps
> = ({ objects, selectedConnectorId, onPropertyUpdate }) => {
	const messages = useCanvasMessages();
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	if (!label?.text) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowBackground}>
			<PropertyColorField
				value={label.fill ?? AUTO_COLOR}
				property="label.fill"
				role="canvas"
				title={messages.menuLabelBackgroundColor}
				onPropertyUpdate={onPropertyUpdate}
			/>
		</PropertyRow>
	);
};

export const ConnectorLabelBackgroundItem = memo(
	ConnectorLabelBackgroundItemComponent,
);

/** The outline of the label's box; drawn only while its width is above 0. */
const ConnectorLabelBorderColorItemComponent: React.FC<
	PropertyPanelItemProps
> = ({ objects, selectedConnectorId, onPropertyUpdate }) => {
	const messages = useCanvasMessages();
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	if (!label?.text) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<PropertyColorField
				value={label.stroke ?? AUTO_COLOR}
				property="label.stroke"
				role="ink"
				title={messages.menuLabelBorderColor}
				onPropertyUpdate={onPropertyUpdate}
			/>
		</PropertyRow>
	);
};

export const ConnectorLabelBorderColorItem = memo(
	ConnectorLabelBorderColorItemComponent,
);

/** How thick the label's outline is drawn. 0 (the default) draws none. */
const ConnectorLabelBorderWidthItemComponent: React.FC<
	PropertyPanelItemProps
> = ({ objects, selectedConnectorId, onPropertyUpdate }) => {
	const messages = useCanvasMessages();
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	if (!label?.text) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowWidth}>
			<PropertyNumberField
				value={label.strokeWidth ?? 0}
				min={MIN_BORDER_WIDTH}
				max={MAX_BORDER_WIDTH}
				ariaLabel={messages.menuBorderWidth}
				testId="property-field:label.strokeWidth"
				onUpdate={(value, commit, coalesceHistory) =>
					onPropertyUpdate(
						"label.strokeWidth",
						String(value),
						commit,
						coalesceHistory,
					)
				}
			/>
		</PropertyRow>
	);
};

export const ConnectorLabelBorderWidthItem = memo(
	ConnectorLabelBorderWidthItemComponent,
);

/** Solid, dashed or dotted. An unset value draws solid, so that is what reads active. */
const ConnectorLabelBorderTypeItemComponent: React.FC<
	PropertyPanelItemProps
> = ({ objects, selectedConnectorId }) => {
	const messages = useCanvasMessages();
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	if (!label?.text) {
		return null;
	}

	const dashType = label.strokeDashType ?? DEFAULT_STROKE_DASH_TYPE;

	return (
		<PropertyRow label={messages.propertyPanelRowType}>
			<PropertySegmentedControl
				options={[
					{
						id: "solid",
						part: setPart("label.strokeDashType", "solid"),
						title: messages.menuSolidLine,
						content: <SolidLineIcon title={messages.menuSolidLine} />,
						isActive: dashType === "solid",
					},
					{
						id: "dashed",
						part: setPart("label.strokeDashType", "dashed"),
						title: messages.menuDashedLine,
						content: <DashedLineIcon title={messages.menuDashedLine} />,
						isActive: dashType === "dashed",
					},
					{
						id: "dotted",
						part: setPart("label.strokeDashType", "dotted"),
						title: messages.menuDottedLine,
						content: <DottedLineIcon title={messages.menuDottedLine} />,
						isActive: dashType === "dotted",
					},
				]}
			/>
		</PropertyRow>
	);
};

export const ConnectorLabelBorderTypeItem = memo(
	ConnectorLabelBorderTypeItemComponent,
);

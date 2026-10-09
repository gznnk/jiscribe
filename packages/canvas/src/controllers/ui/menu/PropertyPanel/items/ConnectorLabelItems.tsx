/**
 * The rows of the connector's Label and Label border sections: the text and the
 * box a label is drawn in, stated one property at a time under `label.*`.
 *
 * Each row states its value through the style intent of the property's own name
 * (useConnectorLabelStyle), the way the ObjectMenu's LabelStyleMenu does — so
 * the two surfaces and the writes behind them cannot disagree. A label property
 * is one the connector declares for itself, so the rows read it through that
 * declaration (CONNECTOR_STYLE_ENTRIES), which is what types the value.
 *
 * Every row returns null while the selected connector carries no label text —
 * there is nothing to style until a label exists — and the sections' own
 * `isShown` takes their headings away with them (see applyObjectDefinition).
 * The two sections are the sidebar twin of the ObjectMenu's LabelStyleMenu,
 * which splits the same properties across two sections of icons.
 */

import { CONNECTOR_LABEL_DEFAULTS } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { memo } from "react";

import { setPart } from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { isBoldFontWeight } from "../../../../utils/isBoldFontWeight";
import { BoldIcon } from "../../../icons/BoldIcon";
import { DashedLineIcon } from "../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../icons/DottedLineIcon";
import { SolidLineIcon } from "../../../icons/SolidLineIcon";
import { useConnectorLabelStyle } from "../../hooks/useConnectorLabelStyle";
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

/** What a label with no `strokeWidth` of its own is drawn with: no border. */
const UNSET_BORDER_WIDTH = 0;

/** The face the label's text is drawn in, picked from the shipped set. */
const ConnectorLabelFontFamilyItemComponent: React.FC<
	PropertyPanelItemProps
> = ({ objects, selection }) => {
	const messages = useCanvasMessages();
	usePreviewFonts(messages);
	// An unset family draws in the default one, so that is the entry to mark active.
	const { value: fontFamily, hasLabelText } = useConnectorLabelStyle(
		"label.fontFamily",
		CONNECTOR_LABEL_DEFAULTS.fontFamily,
		{ objects, selection },
	);

	if (!hasLabelText) {
		return null;
	}

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
	selection,
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const { value: fontSize, hasLabelText } = useConnectorLabelStyle(
		"label.fontSize",
		CONNECTOR_LABEL_DEFAULTS.fontSize,
		{ objects, selection },
	);

	if (!hasLabelText) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowSize}>
			<PropertyNumberField
				value={fontSize}
				min={MIN_FONT_SIZE}
				max={MAX_FONT_SIZE}
				ariaLabel={messages.menuLabelFontSize}
				testId="property-field:label.fontSize"
				onUpdate={(value, commit, coalesceHistory) =>
					onStyleIntent(
						{ kind: "label.fontSize", value },
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
> = ({ objects, selection, onStyleIntent }) => {
	const messages = useCanvasMessages();
	const { value: fontColor, hasLabelText } = useConnectorLabelStyle(
		"label.fontColor",
		AUTO_COLOR,
		{ objects, selection },
	);

	if (!hasLabelText) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<PropertyColorField
				value={fontColor}
				property="label.fontColor"
				role="ink"
				title={messages.menuLabelFontColor}
				onStyleIntent={onStyleIntent}
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
	selection,
}) => {
	const messages = useCanvasMessages();
	const { value: fontWeight, hasLabelText } = useConnectorLabelStyle(
		"label.fontWeight",
		undefined,
		{ objects, selection },
	);
	const isBold = isBoldFontWeight(fontWeight);

	if (!hasLabelText) {
		return null;
	}

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
> = ({ objects, selection, onStyleIntent }) => {
	const messages = useCanvasMessages();
	const { value: fill, hasLabelText } = useConnectorLabelStyle(
		"label.fill",
		AUTO_COLOR,
		{ objects, selection },
	);

	if (!hasLabelText) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowBackground}>
			<PropertyColorField
				value={fill}
				property="label.fill"
				role="canvas"
				// The label of the one selected connector is the whole target.
				currentColorIsShared
				title={messages.menuLabelBackgroundColor}
				onStyleIntent={onStyleIntent}
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
> = ({ objects, selection, onStyleIntent }) => {
	const messages = useCanvasMessages();
	const { value: stroke, hasLabelText } = useConnectorLabelStyle(
		"label.stroke",
		AUTO_COLOR,
		{ objects, selection },
	);

	if (!hasLabelText) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<PropertyColorField
				value={stroke}
				property="label.stroke"
				role="ink"
				// The label of the one selected connector is the whole target.
				currentColorIsShared
				title={messages.menuLabelBorderColor}
				onStyleIntent={onStyleIntent}
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
> = ({ objects, selection, onStyleIntent }) => {
	const messages = useCanvasMessages();
	const { value: strokeWidth, hasLabelText } = useConnectorLabelStyle(
		"label.strokeWidth",
		UNSET_BORDER_WIDTH,
		{ objects, selection },
	);

	if (!hasLabelText) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowWidth}>
			<PropertyNumberField
				value={strokeWidth}
				min={MIN_BORDER_WIDTH}
				max={MAX_BORDER_WIDTH}
				ariaLabel={messages.menuBorderWidth}
				testId="property-field:label.strokeWidth"
				onUpdate={(value, commit, coalesceHistory) =>
					onStyleIntent(
						{ kind: "label.strokeWidth", value },
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
> = ({ objects, selection }) => {
	const messages = useCanvasMessages();
	const { value: dashType, hasLabelText } = useConnectorLabelStyle(
		"label.strokeDashType",
		SHAPE_STYLE_FALLBACK.strokeDashType,
		{ objects, selection },
	);

	if (!hasLabelText) {
		return null;
	}

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

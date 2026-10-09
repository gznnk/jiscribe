import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/text/style/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";
import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { isSelectionTextBlock } from "../../../../commands/shape/ToggleTextLayoutCommand";
import {
	commandPart,
	setPart,
} from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { useSelectionStyle } from "../../../../style/SelectionStyleReaderContext";
import {
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
	selectionValueOrFirst,
} from "../../../../style/SelectionValue";
import { AlignBottomIcon } from "../../../icons/AlignBottomIcon";
import { AlignCenterIcon } from "../../../icons/AlignCenterIcon";
import { AlignLeftIcon } from "../../../icons/AlignLeftIcon";
import { AlignMiddleIcon } from "../../../icons/AlignMiddleIcon";
import { AlignRightIcon } from "../../../icons/AlignRightIcon";
import { AlignTopIcon } from "../../../icons/AlignTopIcon";
import { BoldIcon } from "../../../icons/BoldIcon";
import { ItalicIcon } from "../../../icons/ItalicIcon";
import { StrikethroughIcon } from "../../../icons/StrikethroughIcon";
import { UnderlineIcon } from "../../../icons/UnderlineIcon";
import {
	useSelectedTextAlign,
	useSelectedVerticalAlign,
} from "../../hooks/useSelectedAlign";
import { useTextFormatToggles } from "../../hooks/useTextFormatToggles";
import {
	ObjectMenuFontFamilyList,
	usePreviewFonts,
} from "../../ObjectMenu/common/ObjectMenuFontFamilyList";
import { PropertyCheckbox } from "../common/PropertyCheckbox";
import { PropertyColorField } from "../common/PropertyColorField";
import { PropertyDropdownTriggerLabel } from "../common/PropertyControlsStyled";
import { PropertyDropdownField } from "../common/PropertyDropdownField";
import { PropertyNumberField } from "../common/PropertyNumberField";
import { PropertyRow } from "../common/PropertyRow";
import { PropertySegmentedControl } from "../common/PropertySegmentedControl";
import { resolveFontFamilyLabel } from "../utils/resolveFontFamilyLabel";

const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 999;

/** The face the selected text is drawn in, picked from the shipped set. */
const FontFamilyItemComponent: React.FC<BuiltinItemProps> = () => {
	const messages = useCanvasMessages();
	usePreviewFonts(messages);
	const selectionFontFamily = useSelectionStyle("fontFamily");
	// An unset family draws in the default one, so that is the entry to mark active.
	const fontFamily = selectionValueOr(selectionFontFamily, DEFAULT_FONT_FAMILY);
	const isMixed = isMixedSelectionValue(selectionFontFamily);

	return (
		<PropertyRow label={messages.menuFontFamily}>
			<PropertyDropdownField
				title={messages.menuFontFamily}
				isMixed={isMixed}
				preview={
					<PropertyDropdownTriggerLabel style={{ fontFamily }}>
						{resolveFontFamilyLabel(fontFamily, messages)}
					</PropertyDropdownTriggerLabel>
				}
			>
				<ObjectMenuFontFamilyList
					activeFontFamily={isMixed ? undefined : fontFamily}
					property="fontFamily"
				/>
			</PropertyDropdownField>
		</PropertyRow>
	);
};

export const FontFamilyItem = memo(FontFamilyItemComponent);

/** How large the selected text is drawn. */
const FontSizeItemComponent: React.FC<BuiltinItemProps> = ({
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const fontSize = useSelectionStyle("fontSize");

	return (
		<PropertyRow label={messages.propertyPanelRowSize}>
			<PropertyNumberField
				value={selectionValueOrFirst(fontSize, TEXT_STYLE_FALLBACK.fontSize)}
				isMixed={isMixedSelectionValue(fontSize)}
				min={MIN_FONT_SIZE}
				max={MAX_FONT_SIZE}
				ariaLabel={messages.menuFontSize}
				testId="property-field:fontSize"
				onUpdate={(value, commit, coalesceHistory) =>
					onStyleIntent(
						{ kind: "fontSize", size: value },
						commit,
						coalesceHistory,
					)
				}
			/>
		</PropertyRow>
	);
};

export const FontSizeItem = memo(FontSizeItemComponent);

/** The ink the selected text is drawn in. */
const FontColorItemComponent: React.FC<BuiltinItemProps> = ({
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const fontColor = useSelectionStyle("fontColor");

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<PropertyColorField
				value={selectionValueOr(fontColor, TEXT_STYLE_FALLBACK.fontColor)}
				mixedValues={selectionMixedValues(fontColor)?.map(
					(mixedColor) => mixedColor ?? TEXT_STYLE_FALLBACK.fontColor,
				)}
				property="fontColor"
				role="ink"
				title={messages.menuFontColor}
				onStyleIntent={onStyleIntent}
			/>
		</PropertyRow>
	);
};

export const FontColorItem = memo(FontColorItemComponent);

/**
 * Bold / italic / underline / strikethrough. Each button writes the value the
 * press should land on rather than a toggle command, so what it does is decided
 * against what the text is actually drawn with.
 */
const TextFormatItemComponent: React.FC<BuiltinItemProps> = () => {
	const messages = useCanvasMessages();
	const toggles = useTextFormatToggles();

	return (
		<PropertyRow label={messages.propertyPanelRowStyle}>
			<PropertySegmentedControl
				options={[
					{
						id: "bold",
						part: toggles.bold.part,
						title: messages.menuBold,
						content: <BoldIcon title={messages.menuBold} />,
						isActive: toggles.bold.isActive,
					},
					{
						id: "italic",
						part: toggles.italic.part,
						title: messages.menuItalic,
						content: <ItalicIcon title={messages.menuItalic} />,
						isActive: toggles.italic.isActive,
					},
					{
						id: "underline",
						part: toggles.underline.part,
						title: messages.menuUnderline,
						content: <UnderlineIcon title={messages.menuUnderline} />,
						isActive: toggles.underline.isActive,
					},
					{
						id: "strikethrough",
						part: toggles.strikethrough.part,
						title: messages.menuStrikethrough,
						content: <StrikethroughIcon title={messages.menuStrikethrough} />,
						isActive: toggles.strikethrough.isActive,
					},
				]}
			/>
		</PropertyRow>
	);
};

export const TextFormatItem = memo(TextFormatItemComponent);

/** Where the text sits across the width of its region. */
const TextAlignItemComponent: React.FC<BuiltinItemProps> = () => {
	const messages = useCanvasMessages();
	const textAlign = useSelectedTextAlign();

	return (
		<PropertyRow label={messages.propertyPanelRowHorizontal}>
			<PropertySegmentedControl
				isMixed={textAlign.isMixed}
				options={[
					{
						id: "left",
						part: setPart("textAlign", "left"),
						title: messages.menuAlignLeft,
						content: <AlignLeftIcon />,
						isActive: textAlign.value === "left",
					},
					{
						id: "center",
						part: setPart("textAlign", "center"),
						title: messages.menuAlignCenter,
						content: <AlignCenterIcon />,
						isActive: textAlign.value === "center",
					},
					{
						id: "right",
						part: setPart("textAlign", "right"),
						title: messages.menuAlignRight,
						content: <AlignRightIcon />,
						isActive: textAlign.value === "right",
					},
				]}
			/>
		</PropertyRow>
	);
};

export const TextAlignItem = memo(TextAlignItemComponent);

/** Where the text sits down the height of its region. */
const VerticalAlignItemComponent: React.FC<BuiltinItemProps> = () => {
	const messages = useCanvasMessages();
	const verticalAlign = useSelectedVerticalAlign();

	return (
		<PropertyRow label={messages.propertyPanelRowVertical}>
			<PropertySegmentedControl
				isMixed={verticalAlign.isMixed}
				options={[
					{
						id: "top",
						part: setPart("verticalAlign", "top"),
						title: messages.menuAlignTop,
						content: <AlignTopIcon />,
						isActive: verticalAlign.value === "top",
					},
					{
						id: "middle",
						part: setPart("verticalAlign", "middle"),
						title: messages.menuAlignMiddle,
						content: <AlignMiddleIcon />,
						isActive: verticalAlign.value === "middle",
					},
					{
						id: "bottom",
						part: setPart("verticalAlign", "bottom"),
						title: messages.menuAlignBottom,
						content: <AlignBottomIcon />,
						isActive: verticalAlign.value === "bottom",
					},
				]}
			/>
		</PropertyRow>
	);
};

export const VerticalAlignItem = memo(VerticalAlignItemComponent);

/**
 * Whether a text keeps a width the text wraps in, or one measured from the text.
 * Lit when every text in the selection already wraps in a width of its own (see
 * `isSelectionTextBlock`).
 */
const TextLayoutItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const isBlock = isSelectionTextBlock(canvasState);

	return (
		<PropertyCheckbox
			isOn={isBlock}
			part={commandPart("toggleTextLayout")}
			label={messages.menuWrapTextInWidth}
			title={
				isBlock ? messages.menuFitWidthToText : messages.menuWrapTextInWidth
			}
		/>
	);
};

export const TextLayoutItem = memo(TextLayoutItemComponent);

/**
 * Which box the text is placed on: the region the shape's own outline leaves
 * clear, or its whole height. Two named segments rather than a switch, so both
 * choices are in view and the one in force is the lit one; a selection whose
 * switchable shapes disagree lights neither, and one holding nothing the switch
 * moves reports no value at all (textVerticalBasisEntry).
 */
const TextVerticalBasisItemComponent: React.FC<BuiltinItemProps> = () => {
	const messages = useCanvasMessages();
	const selectionBasis = useSelectionStyle("textVerticalBasis");
	const basis = selectionValueOr(selectionBasis, "region");

	return (
		<PropertyRow label={messages.propertyPanelRowTextBasis}>
			<PropertySegmentedControl
				isMixed={isMixedSelectionValue(selectionBasis)}
				options={[
					{
						id: "region",
						part: setPart("textVerticalBasis", "region"),
						title: messages.menuTextBasisRegion,
						content: messages.propertyPanelTextBasisRegion,
						isActive: basis === "region",
					},
					{
						id: "frame",
						part: setPart("textVerticalBasis", "frame"),
						title: messages.menuTextBasisFrame,
						content: messages.propertyPanelTextBasisFrame,
						isActive: basis === "frame",
					},
				]}
			/>
		</PropertyRow>
	);
};

export const TextVerticalBasisItem = memo(TextVerticalBasisItemComponent);

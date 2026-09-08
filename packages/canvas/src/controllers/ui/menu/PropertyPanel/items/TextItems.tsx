import {
	CANVAS_FONT_FAMILIES,
	DEFAULT_FONT_FAMILY,
} from "@jiscribe/doc/text/style/fontFamilies";
import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { isSelectionTextBlock } from "../../../../commands/shape/ToggleTextLayoutCommand";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../messages/CanvasMessagesTypes";
import { useCanvasRegistries } from "../../../../registries/CanvasRegistriesContext";
import { isBoldFontWeight } from "../../../../utils/isBoldFontWeight";
import {
	hasTextDecorationToken,
	toggleTextDecorationToken,
} from "../../../../utils/toggleTextDecorationToken";
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
import { readSelectionTextStyle } from "../utils/readSelectionTextStyle";
import { readSelectionTextVerticalBasis } from "../utils/readSelectionTextVerticalBasis";
import {
	isMixedSelectionValue,
	selectionValueOr,
} from "../utils/SelectionValue";

const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 999;

const DEFAULT_FONT_COLOR = "#333333";

/** Readers rather than key names: not every CanvasMessages entry is a string. */
const FONT_FAMILY_LABEL_READERS: Record<
	string,
	(messages: CanvasMessages) => string
> = {
	sans: (messages) => messages.fontFamilySans,
	serif: (messages) => messages.fontFamilySerif,
	mono: (messages) => messages.fontFamilyMono,
	hand: (messages) => messages.fontFamilyHand,
};

/**
 * The name of the shipped family a stack belongs to. A doc naming something else
 * keeps its own string, which is what the shape is drawn with.
 */
const resolveFontFamilyLabel = (
	fontFamily: string,
	messages: CanvasMessages,
): string => {
	const shipped = CANVAS_FONT_FAMILIES.find(
		(font) => font.stack === fontFamily,
	);
	return shipped === undefined
		? fontFamily
		: FONT_FAMILY_LABEL_READERS[shipped.id](messages);
};

/** The face the selected text is drawn in, picked from the shipped set. */
const FontFamilyItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	usePreviewFonts(messages);
	const { objectTextStyleDefaults } = useCanvasRegistries();
	const textStyle = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	);
	// An unset family draws in the default one, so that is the entry to mark active.
	const fontFamily =
		selectionValueOr(textStyle.fontFamily, undefined) ?? DEFAULT_FONT_FAMILY;

	return (
		<PropertyRow label={messages.menuFontFamily}>
			<PropertyDropdownField
				title={messages.menuFontFamily}
				isMixed={isMixedSelectionValue(textStyle.fontFamily)}
				preview={
					<PropertyDropdownTriggerLabel style={{ fontFamily }}>
						{resolveFontFamilyLabel(fontFamily, messages)}
					</PropertyDropdownTriggerLabel>
				}
			>
				<ObjectMenuFontFamilyList
					activeFontFamily={fontFamily}
					property="fontFamily"
				/>
			</PropertyDropdownField>
		</PropertyRow>
	);
};

export const FontFamilyItem = memo(FontFamilyItemComponent);

/** How large the selected text is drawn. */
const FontSizeItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const { objectTextStyleDefaults } = useCanvasRegistries();
	const { fontSize } = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	);

	return (
		<PropertyRow label={messages.propertyPanelRowSize}>
			<PropertyNumberField
				value={selectionValueOr(fontSize, undefined) ?? DEFAULT_FONT_SIZE}
				isMixed={isMixedSelectionValue(fontSize)}
				min={MIN_FONT_SIZE}
				max={MAX_FONT_SIZE}
				ariaLabel={messages.menuFontSize}
				testId="property-field:fontSize"
				onUpdate={(value, commit, coalesceHistory) =>
					onPropertyUpdate("fontSize", String(value), commit, coalesceHistory)
				}
			/>
		</PropertyRow>
	);
};

export const FontSizeItem = memo(FontSizeItemComponent);

/** The ink the selected text is drawn in. */
const FontColorItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const { objectTextStyleDefaults } = useCanvasRegistries();
	const { fontColor } = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	);

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<PropertyColorField
				value={selectionValueOr(fontColor, undefined) ?? DEFAULT_FONT_COLOR}
				isMixed={isMixedSelectionValue(fontColor)}
				property="fontColor"
				role="ink"
				title={messages.menuFontColor}
				onPropertyUpdate={onPropertyUpdate}
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
const TextFormatItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const { objectTextStyleDefaults } = useCanvasRegistries();
	const textStyle = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	);
	// Each button is its own toggle, so mixing is read per field: a selection that
	// disagrees only about the weight still lights italic on the ones it agrees on.
	// A field it disagrees about reads as off, so one press brings all of it on.
	const fontWeight = selectionValueOr(textStyle.fontWeight, undefined);
	const fontStyle = selectionValueOr(textStyle.fontStyle, undefined);
	const textDecoration = selectionValueOr(textStyle.textDecoration, undefined);
	const isBold = isBoldFontWeight(fontWeight);
	const isItalic = fontStyle === "italic";
	const isUnderline = hasTextDecorationToken(textDecoration, "underline");
	const isStrikethrough = hasTextDecorationToken(
		textDecoration,
		"line-through",
	);

	return (
		<PropertyRow label={messages.propertyPanelRowStyle}>
			<PropertySegmentedControl
				options={[
					{
						id: "bold",
						part: `set:fontWeight:${isBold ? "normal" : "bold"}`,
						title: messages.menuBold,
						content: <BoldIcon title={messages.menuBold} />,
						isActive: isBold,
					},
					{
						id: "italic",
						part: `set:fontStyle:${isItalic ? "normal" : "italic"}`,
						title: messages.menuItalic,
						content: <ItalicIcon title={messages.menuItalic} />,
						isActive: isItalic,
					},
					{
						id: "underline",
						part: `set:textDecoration:${toggleTextDecorationToken(
							textDecoration,
							"underline",
						)}`,
						title: messages.menuUnderline,
						content: <UnderlineIcon title={messages.menuUnderline} />,
						isActive: isUnderline,
					},
					{
						id: "strikethrough",
						part: `set:textDecoration:${toggleTextDecorationToken(
							textDecoration,
							"line-through",
						)}`,
						title: messages.menuStrikethrough,
						content: <StrikethroughIcon title={messages.menuStrikethrough} />,
						isActive: isStrikethrough,
					},
				]}
			/>
		</PropertyRow>
	);
};

export const TextFormatItem = memo(TextFormatItemComponent);

/** Where the text sits across the width of its region. */
const TextAlignItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const { objectTextStyleDefaults } = useCanvasRegistries();
	const selectionTextAlign = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	).textAlign;
	const textAlign = selectionValueOr(selectionTextAlign, undefined) ?? "left";

	return (
		<PropertyRow label={messages.propertyPanelRowHorizontal}>
			<PropertySegmentedControl
				isMixed={isMixedSelectionValue(selectionTextAlign)}
				options={[
					{
						id: "left",
						part: "set:textAlign:left",
						title: messages.menuAlignLeft,
						content: <AlignLeftIcon />,
						isActive: textAlign === "left",
					},
					{
						id: "center",
						part: "set:textAlign:center",
						title: messages.menuAlignCenter,
						content: <AlignCenterIcon />,
						isActive: textAlign === "center",
					},
					{
						id: "right",
						part: "set:textAlign:right",
						title: messages.menuAlignRight,
						content: <AlignRightIcon />,
						isActive: textAlign === "right",
					},
				]}
			/>
		</PropertyRow>
	);
};

export const TextAlignItem = memo(TextAlignItemComponent);

/** Where the text sits down the height of its region. */
const VerticalAlignItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const { objectTextStyleDefaults } = useCanvasRegistries();
	const selectionVerticalAlign = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	).verticalAlign;
	const verticalAlign =
		selectionValueOr(selectionVerticalAlign, undefined) ?? "middle";

	return (
		<PropertyRow label={messages.propertyPanelRowVertical}>
			<PropertySegmentedControl
				isMixed={isMixedSelectionValue(selectionVerticalAlign)}
				options={[
					{
						id: "top",
						part: "set:verticalAlign:top",
						title: messages.menuAlignTop,
						content: <AlignTopIcon />,
						isActive: verticalAlign === "top",
					},
					{
						id: "middle",
						part: "set:verticalAlign:middle",
						title: messages.menuAlignMiddle,
						content: <AlignMiddleIcon />,
						isActive: verticalAlign === "middle",
					},
					{
						id: "bottom",
						part: "set:verticalAlign:bottom",
						title: messages.menuAlignBottom,
						content: <AlignBottomIcon />,
						isActive: verticalAlign === "bottom",
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
			part="command:toggleTextLayout"
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
 * switchable shapes disagree lights neither (see
 * `readSelectionTextVerticalBasis`).
 */
const TextVerticalBasisItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const { objectTextVerticalBasis } = useCanvasRegistries();
	const selectionBasis = readSelectionTextVerticalBasis(
		canvasState,
		objectTextVerticalBasis,
	);
	const basis = selectionValueOr(selectionBasis, "region");

	return (
		<PropertyRow label={messages.propertyPanelRowTextBasis}>
			<PropertySegmentedControl
				isMixed={isMixedSelectionValue(selectionBasis)}
				options={[
					{
						id: "region",
						part: "set:textVerticalBasis:region",
						title: messages.menuTextBasisRegion,
						content: messages.propertyPanelTextBasisRegion,
						isActive: basis === "region",
					},
					{
						id: "frame",
						part: "set:textVerticalBasis:frame",
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

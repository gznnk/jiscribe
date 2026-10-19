import { ArrowTypes } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import {
	commandAction,
	setAction,
} from "../../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../messages/CanvasMessagesTypes";
import type { SelectionValue } from "../../../../style/SelectionValue";
import {
	isMixedSelectionValue,
	selectionValueOr,
} from "../../../../style/SelectionValue";
import { ArrowSwapIcon } from "../../../icons/ArrowSwapIcon";
import { ArrowHeadIconPreview } from "../../ObjectMenu/items/ArrowHeadMenu/ArrowHeadIconPreview";
import {
	ArrowSelectorGrid,
	ArrowTypeButton,
} from "../../ObjectMenu/items/ArrowHeadMenu/ArrowHeadMenuStyled";
import { useSelectionStyle } from "../../SelectionStyleReaderContext";
import {
	PropertyIconButton,
	PropertyMixedLabel,
} from "../common/PropertyControlsStyled";
import { PropertyDropdownField } from "../common/PropertyDropdownField";
import { PropertyRow } from "../common/PropertyRow";

/** Size the swap icon is drawn at, leaving the button's border a margin of its own. */
const SWAP_ICON_SIZE = 16;

/**
 * One end of the arrow: a trigger showing the mark that end carries, opening
 * the grid of marks for it. A selection whose ends carry different marks lights
 * none of them, the trigger showing the dash instead of one of the marks as the
 * end's.
 */
const ArrowEndField: React.FC<{
	property: "startArrow" | "endArrow";
	direction: "start" | "end";
	title: string;
	arrowType: SelectionValue<ArrowType>;
	messages: CanvasMessages;
}> = ({ property, direction, title, arrowType, messages }) => {
	const isMixed = isMixedSelectionValue(arrowType);
	const current = selectionValueOr(arrowType, SHAPE_STYLE_FALLBACK[property]);

	return (
		<PropertyDropdownField
			title={title}
			isMixed={isMixed}
			mixedPreview={
				<PropertyMixedLabel>
					{messages.propertyPanelMixedPlaceholder}
				</PropertyMixedLabel>
			}
			preview={
				<ArrowHeadIconPreview arrowType={current} direction={direction} />
			}
		>
			<ArrowSelectorGrid>
				{ArrowTypes.map((type) => (
					<ArrowTypeButton
						key={type}
						isActive={!isMixed && current === type}
						data-action={setAction(property, type)}
						title={messages.arrowTypeNames[type] ?? type}
					>
						<ArrowHeadIconPreview arrowType={type} direction={direction} />
					</ArrowTypeButton>
				))}
			</ArrowSelectorGrid>
		</PropertyDropdownField>
	);
};

/**
 * The marks on the two ends of an arrow, in the ObjectMenu's own trio: the
 * start's trigger, the swap command, the end's trigger. The label column is
 * left empty — the section heading names the row, and each control names itself
 * through its title. Triggers rather than the menu's inline buttons: the
 * sidebar has no room for fifteen marks side by side, so each end shows what it
 * is set to and opens the grid.
 */
const ArrowHeadsItemComponent: React.FC<BuiltinItemProps> = () => {
	const messages = useCanvasMessages();
	const startArrow = useSelectionStyle("startArrow");
	const endArrow = useSelectionStyle("endArrow");

	return (
		<PropertyRow>
			<ArrowEndField
				property="startArrow"
				direction="start"
				title={messages.menuStartArrow}
				arrowType={startArrow}
				messages={messages}
			/>
			<PropertyIconButton
				type="button"
				data-action={commandAction("swapArrows")}
				title={messages.menuSwapArrows}
				aria-label={messages.menuSwapArrows}
			>
				<ArrowSwapIcon
					fill="currentColor"
					width={SWAP_ICON_SIZE}
					height={SWAP_ICON_SIZE}
				/>
			</PropertyIconButton>
			<ArrowEndField
				property="endArrow"
				direction="end"
				title={messages.menuEndArrow}
				arrowType={endArrow}
				messages={messages}
			/>
		</PropertyRow>
	);
};

export const ArrowHeadsItem = memo(ArrowHeadsItemComponent);

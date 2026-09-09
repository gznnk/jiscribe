import { ArrowTypes } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import {
	commandPart,
	setPart,
} from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../messages/CanvasMessagesTypes";
import { ArrowSwapIcon } from "../../../icons/ArrowSwapIcon";
import { ArrowHeadIconPreview } from "../../ObjectMenu/items/ArrowHeadMenu/ArrowHeadIconPreview";
import {
	ArrowSelectorGrid,
	ArrowTypeButton,
} from "../../ObjectMenu/items/ArrowHeadMenu/ArrowHeadMenuStyled";
import {
	PropertyIconButton,
	PropertyMixedLabel,
} from "../common/PropertyControlsStyled";
import { PropertyDropdownField } from "../common/PropertyDropdownField";
import { PropertyRow } from "../common/PropertyRow";
import { readSelectionArrowType } from "../utils/readSelectionArrowType";
import type { SelectionValue } from "../utils/SelectionValue";
import {
	isMixedSelectionValue,
	selectionValueOr,
} from "../utils/SelectionValue";

/** The mark an end nobody set carries, and so the one an empty grid lights. */
const UNSET_ARROW_TYPE: ArrowType = "None";

/** Size the swap icon is drawn at, leaving the button's border a margin of its own. */
const SWAP_ICON_SIZE = 16;

/** En dash standing in for a value the selection disagrees on, where the word for it has no room. */
const MIXED_DASH = "–";

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
	const current = selectionValueOr(arrowType, UNSET_ARROW_TYPE);

	return (
		<PropertyDropdownField
			title={title}
			isMixed={isMixed}
			mixedPreview={<PropertyMixedLabel>{MIXED_DASH}</PropertyMixedLabel>}
			preview={
				<ArrowHeadIconPreview arrowType={current} direction={direction} />
			}
		>
			<ArrowSelectorGrid>
				{ArrowTypes.map((type) => (
					<ArrowTypeButton
						key={type}
						isActive={!isMixed && current === type}
						data-kind="menu"
						data-id="object-menu"
						data-part={setPart(property, type)}
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
const ArrowHeadsItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();

	return (
		<PropertyRow>
			<ArrowEndField
				property="startArrow"
				direction="start"
				title={messages.menuStartArrow}
				arrowType={readSelectionArrowType(canvasState, "startArrow")}
				messages={messages}
			/>
			<PropertyIconButton
				type="button"
				data-kind="menu"
				data-id="object-menu"
				data-part={commandPart("swapArrows")}
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
				arrowType={readSelectionArrowType(canvasState, "endArrow")}
				messages={messages}
			/>
		</PropertyRow>
	);
};

export const ArrowHeadsItem = memo(ArrowHeadsItemComponent);

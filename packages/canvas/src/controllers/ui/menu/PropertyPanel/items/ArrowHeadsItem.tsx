import { ArrowTypes } from "@jiscribe/doc/model/objects/types/ArrowType";
import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../messages/CanvasMessagesTypes";
import { ArrowHeadIconPreview } from "../../ObjectMenu/items/ArrowHeadMenu/ArrowHeadIconPreview";
import {
	ArrowSelectorGrid,
	ArrowTypeButton,
} from "../../ObjectMenu/items/ArrowHeadMenu/ArrowHeadMenuStyled";
import { PropertyDropdownField } from "../common/PropertyDropdownField";
import { PropertyRow } from "../common/PropertyRow";
import { readSelectionArrowType } from "../utils/readSelectionArrowType";
import type { SelectionValue } from "../utils/SelectionValue";
import {
	isMixedSelectionValue,
	selectionValueOr,
} from "../utils/SelectionValue";

/** The mark an end nobody set carries, and so the one an empty row lights. */
const UNSET_ARROW_TYPE: ArrowType = "None";

/**
 * One end of the arrow: its own row, its own grid of marks. A selection whose
 * ends carry different marks lights none of them, the trigger saying so instead
 * of showing one of the marks as the row's.
 */
const ArrowEndRow: React.FC<{
	property: "startArrow" | "endArrow";
	direction: "start" | "end";
	label: string;
	arrowType: SelectionValue<ArrowType>;
	messages: CanvasMessages;
}> = ({ property, direction, label, arrowType, messages }) => {
	const isMixed = isMixedSelectionValue(arrowType);
	const current = selectionValueOr(arrowType, UNSET_ARROW_TYPE);

	return (
		<PropertyRow label={label}>
			<PropertyDropdownField
				title={label}
				isMixed={isMixed}
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
							data-part={`set:${property}:${type}`}
							title={messages.arrowTypeNames[type] ?? type}
						>
							<ArrowHeadIconPreview arrowType={type} direction={direction} />
						</ArrowTypeButton>
					))}
				</ArrowSelectorGrid>
			</PropertyDropdownField>
		</PropertyRow>
	);
};

/**
 * The marks on the two ends of an arrow. Two rows rather than the menu's
 * inline trio: the sidebar has no room for fifteen marks side by side, so each
 * end shows what it is set to and opens the grid.
 */
const ArrowHeadsItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();

	return (
		<>
			<ArrowEndRow
				property="startArrow"
				direction="start"
				label={messages.menuStartArrow}
				arrowType={readSelectionArrowType(canvasState, "startArrow")}
				messages={messages}
			/>
			<ArrowEndRow
				property="endArrow"
				direction="end"
				label={messages.menuEndArrow}
				arrowType={readSelectionArrowType(canvasState, "endArrow")}
				messages={messages}
			/>
		</>
	);
};

export const ArrowHeadsItem = memo(ArrowHeadsItemComponent);

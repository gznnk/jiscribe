import { isAutoColor } from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo } from "react";

import {
	PropertyColorAutoLabel,
	PropertyColorMixedSwatch,
	PropertyColorSwatch,
	PropertyDropdownTriggerLabel,
	PropertyMixedLabel,
} from "./PropertyControlsStyled";
import { PropertyDropdownField } from "./PropertyDropdownField";
import type { AutoColorRole } from "../../../../../rendering/objects/utils/resolveAutoColor";
import { resolveAutoColor } from "../../../../../rendering/objects/utils/resolveAutoColor";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { ObjectMenuColorPickerGrid } from "../../ObjectMenu/common/ObjectMenuColorPickerGrid";
import type { ObjectMenuPropertyUpdater } from "../../ObjectMenu/ObjectMenuTypes";

type PropertyColorFieldProps = {
	/** The color the selection is drawn with, already resolved through its type's defaults. */
	value: string;
	/**
	 * Whether the selection carries several colors. The swatch is then hatched and
	 * the word for that stands in for `value`, which is only one of them; picking
	 * a swatch from the panel writes to the whole selection either way.
	 */
	isMixed?: boolean;
	/** Property a swatch writes to (`fill`, `stroke`, `fontColor`, `background`). */
	property: string;
	/** Which theme color `auto` follows: the shape's ink, its face, or the canvas surface. */
	role: AutoColorRole;
	/**
	 * Whether the picker writes through `onPropertyUpdate` instead of the `set:`
	 * gesture (see ObjectMenuColorPickerGrid). Set by the row whose target is the
	 * document rather than the selection.
	 */
	writesThroughCallback?: boolean;
	/** title / aria-label of the trigger. */
	title: string;
	onPropertyUpdate: ObjectMenuPropertyUpdater;
};

/**
 * A color stated by hand: the swatch the selection is drawn with, opening the
 * menu's own picker grid.
 *
 * `auto` shows the color it currently resolves to beside the word rather than
 * the sentinel, so the swatch never disagrees with the shape.
 *
 * A selection carrying several colors keeps its swatch — hatched, and beside the
 * word for it — rather than falling back to the bare word: the row is still read
 * as a color row at a glance.
 */
const PropertyColorFieldComponent: React.FC<PropertyColorFieldProps> = ({
	value,
	isMixed = false,
	property,
	role,
	writesThroughCallback = false,
	title,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const isAuto = isAutoColor(value);

	return (
		<PropertyDropdownField
			title={title}
			preview={
				<>
					{isMixed ? (
						<PropertyColorMixedSwatch />
					) : (
						<PropertyColorSwatch
							swatchColor={
								value === "transparent" ? value : resolveAutoColor(value, role)
							}
						/>
					)}
					<PropertyDropdownTriggerLabel>
						{isMixed ? (
							<PropertyMixedLabel>
								{messages.propertyPanelMixed}
							</PropertyMixedLabel>
						) : isAuto ? (
							<PropertyColorAutoLabel>
								{messages.colorPickerAuto}
							</PropertyColorAutoLabel>
						) : (
							value
						)}
					</PropertyDropdownTriggerLabel>
				</>
			}
		>
			<ObjectMenuColorPickerGrid
				currentColor={isMixed ? "" : value}
				property={property}
				writesThroughCallback={writesThroughCallback}
				onPropertyUpdate={onPropertyUpdate}
			/>
		</PropertyDropdownField>
	);
};

export const PropertyColorField = memo(PropertyColorFieldComponent);

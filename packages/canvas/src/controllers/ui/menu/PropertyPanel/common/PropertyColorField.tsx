import { isAutoColor } from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo } from "react";

import {
	PropertyColorAutoLabel,
	PropertyColorMixedSwatch,
	PropertyColorMixedSwatchSegment,
	PropertyColorSwatch,
	PropertyDropdownTriggerLabel,
	PropertyMixedLabel,
} from "./PropertyControlsStyled";
import { PropertyDropdownField } from "./PropertyDropdownField";
import { useCanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesContext";
import type { AutoColorRole } from "../../../../../rendering/objects/utils/resolveAutoColor";
import { resolveAutoColor } from "../../../../../rendering/objects/utils/resolveAutoColor";
import { calcMixedColorSegments } from "../../../utils/calcMixedColorSegments";
import { ObjectMenuColorPickerGrid } from "../../ObjectMenu/common/ObjectMenuColorPickerGrid";
import type { StyleIntentUpdater } from "../../ObjectMenu/ObjectMenuTypes";

type PropertyColorFieldProps = {
	/** The color the selection is drawn with, already resolved through its type's defaults. */
	value: string;
	/**
	 * The colors of a selection that disagrees, as the objects state them
	 * (`auto` included; resolved here to `autoSwatchColor` when given, else by
	 * `role`) — a SelectionValue's `values`
	 * (selectionMixedValues). The swatch is then split between the first three
	 * (MAX_MIXED_COLOR_SEGMENTS) and the word for mixed stands in for `value`,
	 * which is only one of them; picking a swatch from the panel writes to the
	 * whole selection either way. Omitted states `value` alone.
	 */
	mixedValues?: readonly string[];
	/** Property a swatch writes to (`fill`, `stroke`, `fontColor`, `background`). */
	property: string;
	/** Which theme color `auto` follows: the shape's ink, its face, or the canvas surface. */
	role: AutoColorRole;
	/**
	 * The color the swatch shows for an `auto` value, a resolved CSS color in
	 * place of the theme token `role` gives; applies to every segment of a mixed
	 * swatch too. Omitted = `role` decides. `value` stays the stated color either
	 * way, so the word "Auto" and the picker's current color are unaffected.
	 */
	autoSwatchColor?: string;
	/**
	 * Whether the picker writes through `onStyleIntent` instead of the `set:`
	 * gesture (see ObjectMenuColorPickerGrid). Set by the row whose target is the
	 * document rather than the selection.
	 */
	writesThroughCallback?: boolean;
	/**
	 * Whether `value` is the color every target of a pick already carries, which
	 * is what lets the picker drop a pick of the color already in place (see
	 * ObjectMenuColorPickerGrid). Defaults to false, which writes always. Only
	 * the callback route (`writesThroughCallback`) depends on it: a row writing
	 * through the `set:` gesture is not committed where nothing changed, whoever
	 * the target is.
	 */
	currentColorIsShared?: boolean;
	/** title / aria-label of the trigger. */
	title: string;
	onStyleIntent: StyleIntentUpdater;
};

/**
 * A color stated by hand: the swatch the selection is drawn with, opening the
 * menu's own picker grid.
 *
 * `auto` shows the color it currently resolves to beside the word rather than
 * the sentinel, so the swatch never disagrees with the shape.
 *
 * A selection carrying several colors keeps its swatch — split between them,
 * beside the word for it — rather than falling back to the bare word: the row
 * is still read as a color row at a glance.
 */
const PropertyColorFieldComponent: React.FC<PropertyColorFieldProps> = ({
	value,
	mixedValues,
	property,
	role,
	autoSwatchColor,
	writesThroughCallback = false,
	currentColorIsShared = false,
	title,
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const isAuto = isAutoColor(value);
	const isMixed = mixedValues !== undefined;
	const resolveSwatchColor = (color: string): string =>
		autoSwatchColor !== undefined && isAutoColor(color)
			? autoSwatchColor
			: resolveAutoColor(color, role);
	const singleColorLabel = isAuto ? (
		<PropertyColorAutoLabel>{messages.colorPickerAuto}</PropertyColorAutoLabel>
	) : (
		value
	);

	return (
		<PropertyDropdownField
			title={title}
			preview={
				<>
					{isMixed ? (
						<PropertyColorMixedSwatch>
							{calcMixedColorSegments(mixedValues).map((segment) => (
								<PropertyColorMixedSwatchSegment
									key={segment.start}
									swatchColor={resolveSwatchColor(segment.color)}
									widthFraction={segment.end - segment.start}
								/>
							))}
						</PropertyColorMixedSwatch>
					) : (
						<PropertyColorSwatch swatchColor={resolveSwatchColor(value)} />
					)}
					<PropertyDropdownTriggerLabel>
						{isMixed ? (
							<PropertyMixedLabel>
								{messages.propertyPanelMixed}
							</PropertyMixedLabel>
						) : (
							singleColorLabel
						)}
					</PropertyDropdownTriggerLabel>
				</>
			}
		>
			<ObjectMenuColorPickerGrid
				currentColor={isMixed ? "" : value}
				property={property}
				writesThroughCallback={writesThroughCallback}
				currentColorIsShared={currentColorIsShared}
				onStyleIntent={onStyleIntent}
			/>
		</PropertyDropdownField>
	);
};

export const PropertyColorField = memo(PropertyColorFieldComponent);

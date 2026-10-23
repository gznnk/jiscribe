import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import {
	PropertyDropdownField,
	PropertyRow,
	resolveLocaleMessages,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { IconPropertyTriggerLabel } from "./IconPropertyStyled";
import { IconGlyph } from "../menu/IconGlyph";
import { IconPicker } from "../menu/IconPicker";
import { IconPickerFrame } from "../menu/IconPickerStyled";
import { lucideIconMessagesByLocale } from "../messages/lucideIconMessages";
import { useSelectedIcon } from "../state/useSelectedIcon";

/**
 * Icon row of the properties sidebar (lucideIcon only): a trigger showing the
 * selected icon and its name, opening the same picker the ObjectMenu's
 * IconPickerMenu does, so a host that hides the ObjectMenu can still change the
 * icon. It opens beside the sidebar, which is narrower than the picker.
 *
 * The name is the icon's own (`circle-user`): the set carries no display names.
 * The label column is left empty: the section heading names the row, and the
 * trigger needs the width for the name.
 */
const IconPropertyComponent: React.FC<PropertyPanelItemProps> = () => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(lucideIconMessagesByLocale, locale);
	const { icon, isMixed } = useSelectedIcon();

	return (
		<PropertyRow>
			<PropertyDropdownField
				title={messages.menuIcon}
				placement="beside"
				isMixed={isMixed}
				preview={
					<>
						<IconGlyph name={icon} size={16} />
						<IconPropertyTriggerLabel>{icon}</IconPropertyTriggerLabel>
					</>
				}
			>
				<IconPickerFrame>
					<IconPicker currentIcon={isMixed ? undefined : icon} />
				</IconPickerFrame>
			</PropertyDropdownField>
		</PropertyRow>
	);
};

export const IconProperty = memo(IconPropertyComponent);

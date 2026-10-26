import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import {
	PropertyDropdownField,
	PropertyRow,
	resolveLocaleMessages,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { AwsIconPropertyTriggerLabel } from "./AwsIconPropertyStyled";
import { AwsIconGlyph } from "../menu/AwsIconGlyph";
import { AwsIconPicker } from "../menu/AwsIconPicker";
import { AwsIconPickerFrame } from "../menu/AwsIconPickerStyled";
import { awsShapesMessagesByLocale } from "../messages/awsShapesMessages";
import { readAwsIconLabel } from "../schema/icon/readAwsIconLabel";
import { useSelectedAwsIcon } from "../state/useSelectedAwsIcon";

/**
 * Icon row of the properties sidebar (awsIcon only): a trigger showing the
 * selected icon and its name, opening the same picker the ObjectMenu's
 * AwsIconPickerMenu does, so a host that hides the ObjectMenu can still change
 * the icon. It opens beside the sidebar, which is narrower than the picker.
 *
 * The label column is left empty: the section heading names the row, and the
 * trigger needs the width for the name.
 */
const AwsIconPropertyComponent: React.FC<PropertyPanelItemProps> = () => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(awsShapesMessagesByLocale, locale);
	const { icon, isMixed } = useSelectedAwsIcon();

	return (
		<PropertyRow>
			<PropertyDropdownField
				title={messages.menuIcon}
				placement="beside"
				isMixed={isMixed}
				preview={
					<>
						<AwsIconGlyph name={icon} size={16} />
						<AwsIconPropertyTriggerLabel>
							{readAwsIconLabel(icon) ?? icon}
						</AwsIconPropertyTriggerLabel>
					</>
				}
			>
				<AwsIconPickerFrame>
					<AwsIconPicker currentIcon={isMixed ? undefined : icon} />
				</AwsIconPickerFrame>
			</PropertyDropdownField>
		</PropertyRow>
	);
};

export const AwsIconProperty = memo(AwsIconPropertyComponent);

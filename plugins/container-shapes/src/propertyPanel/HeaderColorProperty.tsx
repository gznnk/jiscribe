import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import {
	PropertyColorField,
	PropertyRow,
	resolveLocaleMessages,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { containerMessagesByLocale } from "../messages/containerMessages";
import { getSelectedHeaderFill } from "../state/getSelectedHeaderFill";

/**
 * Header color row of the properties sidebar (container only), sitting under the
 * body color in the Fill section: both state a face of the same shape, and the
 * label column is what tells them apart.
 *
 * The row is a plugin `custom` item, so it reads the selection off
 * PropertyPanelItemProps rather than the controller state the built-in rows take,
 * and writes `headerFill` through `onPropertyUpdate` — the same property and the
 * same picker the ObjectMenu's HeaderColorMenu uses, so the two never disagree.
 *
 * Its wording is owned by this plugin (`useCanvasLocale` + `resolveLocaleMessages`),
 * not by core.
 */
const HeaderColorPropertyComponent: React.FC<PropertyPanelItemProps> = ({
	objects,
	selectedIds,
	onPropertyUpdate,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(containerMessagesByLocale, locale);

	return (
		<PropertyRow label={messages.propertyRowHeader}>
			<PropertyColorField
				value={getSelectedHeaderFill(selectedIds, objects)}
				property="headerFill"
				role="surface"
				title={messages.menuHeaderColor}
				onPropertyUpdate={onPropertyUpdate}
			/>
		</PropertyRow>
	);
};

export const HeaderColorProperty = memo(HeaderColorPropertyComponent);

import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import {
	PropertyNumberField,
	PropertyRow,
	resolveLocaleMessages,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { containerMessagesByLocale } from "../messages/containerMessages";
import { CONTAINER_MIN_HEADER_HEIGHT } from "../schema/ContainerDoc";
import { getSelectedHeaderHeight } from "../state/getSelectedHeaderHeight";

/**
 * Header band height row of the properties sidebar (container only), sitting
 * under the size in the Layout section: the same number the header handle drags
 * (ContainerHeaderHeightControl), stated outright. Labelled "Header" like the
 * color row: the section says which aspect of the header the row states.
 *
 * Written as the `headerHeight` extra style property through `onPropertyUpdate`,
 * so the field's preview / commit / coalescing ride the style route unchanged.
 * The lower bound is the drag's; the upper one is left to the drawing, which
 * clamps the band to the box (`calcContainerHeaderHeight`), since a
 * multi-selection has no single height to bound against.
 */
const HeaderHeightPropertyComponent: React.FC<PropertyPanelItemProps> = ({
	objects,
	selectedIds,
	onPropertyUpdate,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(containerMessagesByLocale, locale);

	return (
		<PropertyRow label={messages.propertyRowHeader}>
			<PropertyNumberField
				value={getSelectedHeaderHeight(selectedIds, objects)}
				min={CONTAINER_MIN_HEADER_HEIGHT}
				ariaLabel={messages.fieldHeaderHeight}
				testId="property-field:headerHeight"
				onUpdate={(value, commit, coalesceHistory) =>
					onPropertyUpdate(
						"headerHeight",
						String(value),
						commit,
						coalesceHistory,
					)
				}
			/>
		</PropertyRow>
	);
};

export const HeaderHeightProperty = memo(HeaderHeightPropertyComponent);

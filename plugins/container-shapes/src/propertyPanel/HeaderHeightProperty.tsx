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
import { useSelectedHeaderHeight } from "../state/useSelectedHeaderHeight";

/**
 * Header band height row of the properties sidebar (container only), sitting
 * under the size in the Layout section: the same number the header handle drags
 * (ContainerHeaderHeightControl), stated outright. Labelled "Header" like the
 * color row: the section says which aspect of the header the row states.
 *
 * Written as the `headerHeight` style the container declares for itself
 * (CONTAINER_STYLE) through `onStyleIntent` — a kind the engine does not own, so
 * the intent is `{ kind, value }` with the value left as the transport string —
 * so the field's preview / commit / coalescing ride the style route unchanged.
 * The lower bound is the drag's; the upper one is left to the drawing, which
 * clamps the band to the box (`calcContainerHeaderHeight`), since a
 * multi-selection has no single height to bound against.
 */
const HeaderHeightPropertyComponent: React.FC<PropertyPanelItemProps> = ({
	onStyleIntent,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(containerMessagesByLocale, locale);
	const headerHeight = useSelectedHeaderHeight();

	return (
		<PropertyRow label={messages.propertyRowHeader}>
			<PropertyNumberField
				value={headerHeight}
				min={CONTAINER_MIN_HEADER_HEIGHT}
				ariaLabel={messages.fieldHeaderHeight}
				testId="property-field:headerHeight"
				onUpdate={(value, commit, coalesceHistory) =>
					onStyleIntent(
						{ kind: "headerHeight", value: String(value) },
						commit,
						coalesceHistory,
					)
				}
			/>
		</PropertyRow>
	);
};

export const HeaderHeightProperty = memo(HeaderHeightPropertyComponent);

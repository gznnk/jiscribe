import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import { PropertyRow, useCanvasMessages } from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { StickyColorPalette } from "../menu/StickyColorPalette";

/**
 * Paper color row of the properties sidebar (sticky only). Lays the ObjectMenu's
 * pastel palette out in the row itself instead of behind a dropdown, so the
 * sidebar offers the same swatches as StickyColorMenu.
 */
const StickyColorPropertyComponent: React.FC<PropertyPanelItemProps> = () => {
	const messages = useCanvasMessages();

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<StickyColorPalette />
		</PropertyRow>
	);
};

export const StickyColorProperty = memo(StickyColorPropertyComponent);

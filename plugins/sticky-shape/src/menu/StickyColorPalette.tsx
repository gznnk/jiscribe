import { setAction, useCanvasMessages } from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { STICKY_PRESET_COLORS } from "./StickyColorConstants";
import { ColorGrid, ColorSwatch } from "./StickyColorMenuStyled";
import { useSelectedStickyColor } from "../state/useSelectedStickyColor";

/**
 * The pastel swatch grid, shared by the ObjectMenu dropdown (StickyColorMenu)
 * and the properties sidebar row (StickyColorProperty). Each swatch writes
 * through the `set:` gesture, which both hosts read.
 */
const StickyColorPaletteComponent: React.FC = () => {
	const messages = useCanvasMessages();
	const currentColor = useSelectedStickyColor();

	return (
		<ColorGrid>
			{STICKY_PRESET_COLORS.map((preset) => (
				<ColorSwatch
					key={preset.value}
					swatchColor={preset.value}
					selected={preset.value.toLowerCase() === currentColor.toLowerCase()}
					data-action={setAction("fill", preset.value)}
					title={messages.colorNames[preset.name] ?? preset.name}
				/>
			))}
		</ColorGrid>
	);
};

export const StickyColorPalette = memo(StickyColorPaletteComponent);

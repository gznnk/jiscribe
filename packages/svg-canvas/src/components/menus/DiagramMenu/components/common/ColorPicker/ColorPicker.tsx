import type React from "react";
import { memo } from "react";

import { DiagramMenuControl } from "../DiagramMenuControl";
import { ColorSelector } from "./ColorSelector";

/**
 * Props for the ColorPicker component.
 */
type ColorPickerProps = {
	color: string;
	/** Called on every color change (real-time updates) */
	onColorChange: (newColor: string) => void;
	/** Called when color change is committed (triggers history saving) */
	onColorChangeCommit: (newColor: string) => void;
};

/**
 * ColorPicker component.
 * Wraps ColorSelector with DiagramMenuControl for use in diagram menus.
 */
const ColorPickerComponent: React.FC<ColorPickerProps> = ({
	color,
	onColorChange,
	onColorChangeCommit,
}) => {
	return (
		<DiagramMenuControl>
			<ColorSelector
				color={color}
				onChange={onColorChange}
				onChangeCommit={onColorChangeCommit}
			/>
		</DiagramMenuControl>
	);
};

export const ColorPicker = memo(ColorPickerComponent);

import type React from "react";
import { memo, useEffect, useState } from "react";

import { PRESET_COLORS } from "./ColorPickerConstants";
import {
	ColorGrid,
	ColorInput,
	ColorPickerContainer,
	ColorSwatch,
} from "./ColorPickerStyled";

/**
 * Props for the ColorSelector component.
 */
type ColorSelectorProps = {
	color: string;
	/** Called on every color change (real-time updates) */
	onChange: (newColor: string) => void;
	/** Called when color change is committed (triggers history saving) */
	onChangeCommit: (newColor: string) => void;
};

/**
 * ColorSelector component.
 * A reusable UI control for selecting colors using preset swatches or custom input.
 * Provides separate callbacks for real-time updates and committed changes.
 */
const ColorSelectorComponent: React.FC<ColorSelectorProps> = ({
	color,
	onChange,
	onChangeCommit,
}) => {
	const [inputValue, setInputValue] = useState(color);
	const [isValid, setIsValid] = useState(true);

	const handleColorClick = (selectedColor: string) => {
		onChangeCommit(selectedColor);
	};

	const handleHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const val = event.target.value;
		setInputValue(val);

		const valid = CSS.supports("color", val);
		setIsValid(valid);

		if (valid) {
			onChange(val);
		}
	};

	const handleInputBlur = () => {
		if (isValid && inputValue !== color) {
			onChangeCommit(inputValue);
		}
	};

	useEffect(() => {
		setInputValue(color);
	}, [color]);

	return (
		<ColorPickerContainer>
			<ColorGrid>
				{PRESET_COLORS.map((preset) => (
					<ColorSwatch
						key={preset.value}
						color={preset.value}
						selected={preset.value.toLowerCase() === color.toLowerCase()}
						onClick={() => handleColorClick(preset.value)}
						title={preset.name}
					/>
				))}
			</ColorGrid>
			<ColorInput
				value={inputValue}
				onChange={handleHexInputChange}
				onBlur={handleInputBlur}
				maxLength={32}
				placeholder="CSS color"
				isValid={isValid}
			/>
		</ColorPickerContainer>
	);
};

export const ColorSelector = memo(ColorSelectorComponent);

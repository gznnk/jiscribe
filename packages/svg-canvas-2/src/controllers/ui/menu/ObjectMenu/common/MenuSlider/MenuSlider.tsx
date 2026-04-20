import type React from "react";
import { memo, useEffect, useState } from "react";

import {
	MenuSliderWrapper,
	MenuSliderInput,
	MenuSliderFooter,
	MenuSliderLabel,
	MenuSliderNumberInput,
} from "./MenuSliderStyled";

/**
 * Props for the MenuSlider component.
 */
type MenuSliderProps = {
	value: number;
	min?: number;
	max?: number;
	/** Label text displayed above the slider */
	label?: string;
	/** Property name for data-id (e.g., "strokeWidth", "rx") */
	property: string;
};

/**
 * MenuSlider component.
 * A UI control for adjusting values using a slider.
 * Uses CanvasEvent system (data-kind/data-id) for property updates.
 */
const MenuSliderComponent: React.FC<MenuSliderProps> = ({
	value,
	min = 1,
	max = 100,
	label = "Value",
	property,
}) => {
	const [sliderValue, setSliderValue] = useState(value);
	const [inputValue, setInputValue] = useState(String(value));
	const [isEditing, setIsEditing] = useState(false);

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = Number.parseInt(e.target.value, 10);
		setSliderValue(newValue);
		setInputValue(String(newValue));
	};

	const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newInputValue = e.target.value;
		setInputValue(newInputValue);

		const parsedValue = Number.parseInt(newInputValue, 10);
		if (!Number.isNaN(parsedValue)) {
			const clampedValue = Math.max(min, Math.min(max, parsedValue));
			setSliderValue(clampedValue);
		}
	};

	const handleNumberInputFocus = () => {
		setIsEditing(true);
	};

	const handleNumberInputBlur = () => {
		setIsEditing(false);
		const parsedValue = Number.parseInt(inputValue, 10);
		if (!Number.isNaN(parsedValue)) {
			const clampedValue = Math.max(min, Math.min(max, parsedValue));
			setSliderValue(clampedValue);
			setInputValue(String(clampedValue));
		} else {
			setInputValue(String(sliderValue));
		}
	};

	useEffect(() => {
		if (!isEditing) {
			setSliderValue(value);
			setInputValue(String(value));
		}
	}, [value, isEditing]);

	return (
		<MenuSliderWrapper>
			<MenuSliderFooter>
				<MenuSliderLabel>{label}</MenuSliderLabel>
				<MenuSliderNumberInput
					type="number"
					min={min}
					max={max}
					value={inputValue}
					onChange={handleNumberInputChange}
					onFocus={handleNumberInputFocus}
					onBlur={handleNumberInputBlur}
					data-kind="object-menu"
					data-id={`object-menu:number-input:${property}`}
					data-interactive="true"
				/>
			</MenuSliderFooter>
			<MenuSliderInput
				type="range"
				min={min}
				max={max}
				value={sliderValue}
				onChange={handleSliderChange}
				data-kind="object-menu"
				data-id={`object-menu:slider:${property}`}
				data-interactive="true"
			/>
		</MenuSliderWrapper>
	);
};

export const MenuSlider = memo(MenuSliderComponent);

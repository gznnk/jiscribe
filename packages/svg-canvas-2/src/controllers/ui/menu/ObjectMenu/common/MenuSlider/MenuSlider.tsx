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
	/** Called on every value change (real-time updates, no history saving) */
	onChange: (newValue: number) => void;
	/** Called when value change is committed (slider mouse up, input blur - triggers history saving) */
	onChangeCommit?: (newValue: number) => void;
};

/**
 * MenuSlider component.
 * A UI control for adjusting values using a slider.
 * Provides separate callbacks for real-time updates and committed changes.
 */
const MenuSliderComponent: React.FC<MenuSliderProps> = ({
	value,
	min = 1,
	max = 100,
	label = "Value",
	onChange,
	onChangeCommit,
}) => {
	const [sliderValue, setSliderValue] = useState(value);
	const [inputValue, setInputValue] = useState(String(value));
	const [isEditing, setIsEditing] = useState(false);

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = Number.parseInt(e.target.value, 10);
		setSliderValue(newValue);
		setInputValue(String(newValue));
		// Real-time update only while dragging the slider (do not commit history)
		onChange(newValue);
	};

	const handleSliderMouseUp = () => {
		// Commit the change (save history) when the user releases the slider
		onChangeCommit?.(sliderValue);
	};

	const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newInputValue = e.target.value;
		setInputValue(newInputValue);

		const parsedValue = Number.parseInt(newInputValue, 10);
		if (!Number.isNaN(parsedValue)) {
			const clampedValue = Math.max(min, Math.min(max, parsedValue));
			setSliderValue(clampedValue);
			onChange(clampedValue);
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
			// Only commit the change (save history) on blur; do not call onChange again
			onChangeCommit?.(clampedValue);
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
				/>
			</MenuSliderFooter>
			<MenuSliderInput
				type="range"
				min={min}
				max={max}
				value={sliderValue}
				onChange={handleSliderChange}
				onMouseUp={handleSliderMouseUp}
			/>
		</MenuSliderWrapper>
	);
};

export const MenuSlider = memo(MenuSliderComponent);

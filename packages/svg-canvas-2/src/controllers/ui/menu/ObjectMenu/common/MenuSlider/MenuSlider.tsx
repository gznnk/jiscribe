import type React from "react";
import { memo, useCallback, useEffect, useState } from "react";

import {
	MenuSliderWrapper,
	MenuSliderInput,
	MenuSliderFooter,
	MenuSliderLabel,
	MenuSliderNumberInput,
} from "./MenuSliderStyled";

type MenuSliderProps = {
	value: number;
	min?: number;
	max?: number;
	label?: string;
	property: string;
	onPropertyUpdate?: (
		property: string,
		value: string,
		commit: boolean,
	) => void;
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
	onPropertyUpdate,
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
			onPropertyUpdate?.(property, String(clampedValue), false);
		}
	};

	const handleNumberInputFocus = () => {
		setIsEditing(true);
	};

	const commitNumberInput = (currentInputValue: string) => {
		const parsedValue = Number.parseInt(currentInputValue, 10);
		if (!Number.isNaN(parsedValue)) {
			const clampedValue = Math.max(min, Math.min(max, parsedValue));
			setSliderValue(clampedValue);
			setInputValue(String(clampedValue));
			onPropertyUpdate?.(property, String(clampedValue), true);
		} else {
			setInputValue(String(sliderValue));
		}
	};

	const handleNumberInputBlur = () => {
		setIsEditing(false);
		commitNumberInput(inputValue);
	};

	const handleNumberInputKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (e.key === "Enter") {
			commitNumberInput(inputValue);
			e.currentTarget.blur();
		}
	};

	const stopPropagation = useCallback((e: React.PointerEvent) => {
		e.stopPropagation();
	}, []);

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
					onKeyDown={handleNumberInputKeyDown}
					onPointerDown={stopPropagation}
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

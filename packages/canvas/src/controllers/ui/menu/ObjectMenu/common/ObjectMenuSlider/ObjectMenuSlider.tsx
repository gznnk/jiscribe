import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
	ObjectMenuSliderWrapper,
	ObjectMenuSliderInput,
	ObjectMenuSliderFooter,
	ObjectMenuSliderLabel,
	ObjectMenuSliderNumberInput,
} from "./ObjectMenuSliderStyled";

type ObjectMenuSliderProps = {
	value: number;
	/** Lower bound of the valid range (number input clamp). */
	min?: number;
	/** Upper bound of the valid range (number input clamp). */
	max?: number;
	/**
	 * Slider track lower bound. Defaults to `min`. The slider only spans the
	 * common range; values outside it are still reachable via the number input.
	 */
	sliderMin?: number;
	/** Slider track upper bound. Defaults to `max`. */
	sliderMax?: number;
	/** Slider drag increment. The number input stays free-form (no snapping). */
	step?: number;
	label?: string;
	property: string;
	onPropertyUpdate?: (property: string, value: string, commit: boolean) => void;
};

const clamp = (value: number, lower: number, upper: number): number =>
	Math.max(lower, Math.min(upper, value));

/**
 * ObjectMenuSlider component.
 * A UI control for adjusting values using a slider.
 * Uses CanvasEvent system (data-kind/data-id) for property updates.
 *
 * The slider track (`sliderMin`..`sliderMax`, stepped by `step`) covers the
 * common range for quick, coarse adjustment. The number input accepts the full
 * valid range (`min`..`max`) for precise or extreme values; when the committed
 * value falls outside the track the thumb pins to the nearest end.
 */
const ObjectMenuSliderComponent: React.FC<ObjectMenuSliderProps> = ({
	value,
	min = 1,
	max = 100,
	sliderMin,
	sliderMax,
	step = 1,
	label = "Value",
	property,
	onPropertyUpdate,
}) => {
	const trackMin = sliderMin ?? min;
	const trackMax = sliderMax ?? max;

	const [sliderValue, setSliderValue] = useState(
		clamp(value, trackMin, trackMax),
	);
	const [inputValue, setInputValue] = useState(String(value));
	// ref used so useEffect can read the latest inputValue after render
	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;
	// whether the user has made a valid edit that has not yet been committed
	const pendingCommit = useRef(false);

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
			const committedValue = clamp(parsedValue, min, max);
			setSliderValue(clamp(committedValue, trackMin, trackMax));
			pendingCommit.current = true;
			onPropertyUpdate?.(property, String(committedValue), false);
		}
	};

	const commitNumberInput = useCallback(
		(currentInputValue: string) => {
			const parsedValue = Number.parseInt(currentInputValue, 10);
			if (!Number.isNaN(parsedValue) && pendingCommit.current) {
				const committedValue = clamp(parsedValue, min, max);
				setSliderValue(clamp(committedValue, trackMin, trackMax));
				setInputValue(String(committedValue));
				onPropertyUpdate?.(property, String(committedValue), true);
				pendingCommit.current = false;
			} else if (Number.isNaN(parsedValue)) {
				setInputValue(String(value));
			}
		},
		[min, max, trackMin, trackMax, property, value, onPropertyUpdate],
	);

	const handleNumberInputBlur = useCallback(() => {
		commitNumberInput(inputValue);
	}, [commitNumberInput, inputValue]);

	const handleNumberInputKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				commitNumberInput(inputValue);
				e.currentTarget.blur();
			}
		},
		[commitNumberInput, inputValue],
	);

	// Reset the input only when `value` differs from the user's input, treating it as an external
	// change (e.g. slider drag). A commit:false preview also updates `value`, but in that case it
	// matches inputValue and is skipped.
	useEffect(() => {
		if (String(value) !== inputValueRef.current) {
			setSliderValue(clamp(value, trackMin, trackMax));
			setInputValue(String(value));
			pendingCommit.current = false;
		}
	}, [value, trackMin, trackMax]);

	return (
		<ObjectMenuSliderWrapper>
			<ObjectMenuSliderFooter>
				<ObjectMenuSliderLabel>{label}</ObjectMenuSliderLabel>
				<ObjectMenuSliderNumberInput
					type="number"
					min={min}
					max={max}
					value={inputValue}
					onChange={handleNumberInputChange}
					onBlur={handleNumberInputBlur}
					onKeyDown={handleNumberInputKeyDown}
					data-testid={`menu-number-input:${property}`}
					data-gesture="none"
				/>
			</ObjectMenuSliderFooter>
			<ObjectMenuSliderInput
				type="range"
				min={trackMin}
				max={trackMax}
				step={step}
				value={sliderValue}
				onChange={handleSliderChange}
				data-kind="menu"
				data-id="object-menu"
				data-part={`slider:${property}`}
				data-gesture="native-pointer"
			/>
		</ObjectMenuSliderWrapper>
	);
};

export const ObjectMenuSlider = memo(ObjectMenuSliderComponent);

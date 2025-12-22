import type React from "react";
import { memo, useEffect, useState } from "react";

// Import components related to SvgCanvas.
import { Minus } from "../../../../../icons/Minus";
import { Plus } from "../../../../../icons/Plus";
// Imports related to this component.
import { DiagramMenuControl } from "../DiagramMenuControl";
import {
	NumberStepperButton,
	NumberStepperContainer,
	NumberStepperInput,
} from "./NumberStepperStyled";

/**
 * Props for the NumberStepper component.
 */
type NumberStepperProps = {
	value: number;
	min?: number;
	max?: number;
	minusTooltip?: string;
	plusTooltip?: string;
	onChange: (newValue: number) => void;
};

/**
 * NumberStepper component.
 * A UI control for adjusting numeric values using +/- buttons or direct input.
 */
const NumberStepperComponent: React.FC<NumberStepperProps> = ({
	value,
	min = Number.MIN_SAFE_INTEGER,
	max = Number.MAX_SAFE_INTEGER,
	minusTooltip = "Decrease",
	plusTooltip = "Increase",
	onChange,
}) => {
	const [inputValue, setInputValue] = useState(value.toString());

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setInputValue(val);

		const parsed = Number.parseInt(val, 10);
		if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
			onChange(parsed);
		}
	};

	const handleMinus = () => {
		if (value > min) {
			onChange(value - 1);
		}
	};

	const handlePlus = () => {
		if (value < max) {
			onChange(value + 1);
		}
	};

	useEffect(() => {
		setInputValue(value.toString());
	}, [value]);

	return (
		<DiagramMenuControl>
			<NumberStepperContainer>
				<NumberStepperButton onClick={handleMinus}>
					<Minus title={minusTooltip} />
				</NumberStepperButton>
				<NumberStepperInput
					value={inputValue}
					maxLength={max.toString().length}
					onChange={handleChange}
				/>
				<NumberStepperButton onClick={handlePlus}>
					<Plus title={plusTooltip} />
				</NumberStepperButton>
			</NumberStepperContainer>
		</DiagramMenuControl>
	);
};

export const NumberStepper = memo(NumberStepperComponent);

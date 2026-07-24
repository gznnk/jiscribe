import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
	AutoButton,
	ColorGrid,
	ColorInputRow,
	ColorPickerContainer,
	ColorSwatch,
	ColorTextInput,
} from "./ObjectMenuColorPickerGridStyled";
import {
	AUTO_COLOR,
	isAutoColor,
} from "../../../../../../schemas/objects/utils/autoColor";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { PRESET_COLORS } from "../../ObjectMenuConstants";

type ObjectMenuColorPickerGridProps = {
	/** Currently selected color */
	currentColor: string;
	/** Property name (e.g. "fill", "stroke") */
	property: string;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Color picker grid.
 * Displays preset color swatches (4×7 grid) and a CSS color text input.
 * Each swatch has data-kind="menu" and updates the property through the gesture system.
 * The text input previews in real time on onChange (commit: false), and
 * commits on onBlur / Enter (commit: true).
 */
const ObjectMenuColorPickerGridComponent: React.FC<
	ObjectMenuColorPickerGridProps
> = ({ currentColor, property, onPropertyUpdate }) => {
	const messages = useCanvasMessages();
	const [inputValue, setInputValue] = useState(currentColor);
	const [isValid, setIsValid] = useState(true);
	// Ref for referencing the latest inputValue from useEffect after render.
	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;
	// Whether the user has made a valid edit that has not yet been committed.
	const pendingCommit = useRef(false);

	// Only treat it as an external change (preset, etc.) and reset the input when currentColor differs from the user's input.
	// A commit:false preview also updates currentColor, but in that case it matches inputValue and is skipped.
	useEffect(() => {
		if (currentColor !== inputValueRef.current) {
			setInputValue(currentColor);
			setIsValid(true);
			pendingCommit.current = false;
		}
	}, [currentColor]);

	const handleTextChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = e.target.value;
			setInputValue(val);
			// "auto" (follows theme) is considered invalid by CSS.supports, so allow it explicitly.
			const valid = isAutoColor(val) || CSS.supports("color", val);
			setIsValid(valid);
			if (valid) {
				pendingCommit.current = true;
				onPropertyUpdate(property, val, false);
			}
		},
		[property, onPropertyUpdate],
	);

	const commit = useCallback(() => {
		if (isValid && pendingCommit.current) {
			onPropertyUpdate(property, inputValue, true);
			pendingCommit.current = false;
		}
	}, [isValid, inputValue, property, onPropertyUpdate]);

	const handleBlur = useCallback(() => {
		commit();
	}, [commit]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				commit();
			}
		},
		[commit],
	);

	return (
		<ColorPickerContainer>
			<ColorGrid>
				{PRESET_COLORS.map((preset) => (
					<ColorSwatch
						key={preset.value}
						swatchColor={preset.value}
						selected={preset.value.toLowerCase() === currentColor.toLowerCase()}
						data-kind="menu"
						data-id="object-menu"
						data-part={`set:${property}:${preset.value}`}
						title={messages.colorNames[preset.name] ?? preset.name}
					/>
				))}
			</ColorGrid>
			<ColorInputRow>
				<AutoButton
					type="button"
					selected={isAutoColor(currentColor)}
					data-kind="menu"
					data-id="object-menu"
					data-part={`set:${property}:${AUTO_COLOR}`}
					title={messages.colorPickerAutoTitle}
				>
					{messages.colorPickerAuto}
				</AutoButton>
				<ColorTextInput
					isValid={isValid}
					value={inputValue}
					onChange={handleTextChange}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					data-gesture="none"
					maxLength={32}
					placeholder={messages.colorPickerCssColorPlaceholder}
					spellCheck={false}
				/>
			</ColorInputRow>
		</ColorPickerContainer>
	);
};

export const ObjectMenuColorPickerGrid = memo(
	ObjectMenuColorPickerGridComponent,
);

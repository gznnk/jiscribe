import {
	AUTO_COLOR,
	isAutoColor,
} from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
	AutoButton,
	ColorGrid,
	ColorInputRow,
	ColorPickerContainer,
	ColorSwatch,
	ColorTextInput,
} from "./ObjectMenuColorPickerGridStyled";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { PRESET_COLORS } from "../../ObjectMenuConstants";
import type { StylePropertyUpdater } from "../../ObjectMenuTypes";

type ObjectMenuColorPickerGridProps = {
	/** Currently selected color */
	currentColor: string;
	/** Property name (e.g. "fill", "stroke") */
	property: string;
	/**
	 * Whether a swatch and the Auto button write through `onPropertyUpdate`
	 * (committing at once) instead of through the `set:` gesture. Set by a picker
	 * whose target is not the selection — the canvas background — since the
	 * gesture route ends in the style registry, which only ever writes to
	 * selected objects. Defaults to false, the floating menu's own route.
	 */
	writesThroughCallback?: boolean;
	onPropertyUpdate: StylePropertyUpdater;
};

/**
 * Color picker grid.
 * Displays preset color swatches (4×7 grid) and a CSS color text input.
 * Each swatch has data-kind="menu" and updates the property through the gesture system,
 * unless `writesThroughCallback` opts the picker out of gestures entirely.
 * The text input previews in real time on onChange (commit: false), and
 * commits on onBlur / Enter (commit: true).
 */
const ObjectMenuColorPickerGridComponent: React.FC<
	ObjectMenuColorPickerGridProps
> = ({
	currentColor,
	property,
	writesThroughCallback = false,
	onPropertyUpdate,
}) => {
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

	// The two routes a swatch (and the Auto button) can take. The gesture one
	// keeps the `set:` grammar the floating menu is read by; the callback one
	// opts out of gestures so no handler applies the write to the selection as
	// well, and still carries data-part, which is what names the swatch.
	const buildPickProps = (value: string) =>
		writesThroughCallback
			? {
					"data-gesture": "none",
					"data-part": `set:${property}:${value}`,
					onClick: () => onPropertyUpdate(property, value, true),
				}
			: {
					"data-kind": "menu",
					"data-id": "object-menu",
					"data-part": `set:${property}:${value}`,
				};

	return (
		<ColorPickerContainer>
			<ColorGrid>
				{PRESET_COLORS.map((preset) => (
					<ColorSwatch
						key={preset.value}
						swatchColor={preset.value}
						selected={preset.value.toLowerCase() === currentColor.toLowerCase()}
						{...buildPickProps(preset.value)}
						title={messages.colorNames[preset.name] ?? preset.name}
					/>
				))}
			</ColorGrid>
			<ColorInputRow>
				<AutoButton
					type="button"
					selected={isAutoColor(currentColor)}
					{...buildPickProps(AUTO_COLOR)}
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

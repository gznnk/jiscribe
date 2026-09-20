import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
	ObjectMenuSliderWrapper,
	ObjectMenuSliderInput,
	ObjectMenuSliderFooter,
	ObjectMenuSliderLabel,
	ObjectMenuSliderNumberInput,
} from "./ObjectMenuSliderStyled";
import { sliderPart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import type { StylePropertyUpdater } from "../../ObjectMenuTypes";

type ObjectMenuSliderProps = {
	/** The value the selection is on; while `isMixed`, one the selection carries (selectionValueOrFirst), which places the thumb. */
	value: number;
	/**
	 * Whether the selection carries several values. The number input is then
	 * drawn empty behind a dash and the thumb hollow, `value` being only one
	 * object's number; typing or dragging still writes to the whole selection.
	 */
	isMixed?: boolean;
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
	onPropertyUpdate?: StylePropertyUpdater;
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
	isMixed = false,
	min = 1,
	max = 100,
	sliderMin,
	sliderMax,
	step = 1,
	label = "Value",
	property,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const trackMin = sliderMin ?? min;
	const trackMax = sliderMax ?? max;
	// What the input agrees with the selection on: empty while the selection
	// disagrees, so no one object's number is shown as the selection's.
	const agreedText = isMixed ? "" : String(value);

	const [sliderValue, setSliderValue] = useState(
		clamp(value, trackMin, trackMax),
	);
	const [inputValue, setInputValue] = useState(agreedText);
	// ref used so useEffect can read the latest inputValue after render
	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;
	// whether the user has made a valid edit that has not yet been committed
	const pendingCommit = useRef(false);
	// Pointer changes on the track are written by the gesture path (ObjectMenuHandler),
	// which is the sole writer for them; dispatching from onChange too would fire on
	// every drag frame. Keyboard changes have no gesture of their own, so they are the
	// only ones this component forwards, gated by this flag.
	const isKeyboardEditing = useRef(false);
	// keyboard-driven value previewed but not yet committed (null when there is none)
	const uncommittedKeyboardValue = useRef<string | null>(null);

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = Number.parseInt(e.target.value, 10);
		setSliderValue(newValue);
		setInputValue(String(newValue));
		if (isKeyboardEditing.current) {
			uncommittedKeyboardValue.current = String(newValue);
			onPropertyUpdate?.(property, String(newValue), false);
		}
	};

	const handleSliderKeyDown = () => {
		isKeyboardEditing.current = true;
	};

	/**
	 * Gives the focus up once the drag (or the track click) that took it is over.
	 * Holding it keeps every canvas shortcut disabled — they are skipped while a
	 * form element has the focus (useKeyboardShortcuts) — and, with a text editor
	 * open, leaves the session without the caret and selection the menu was styling
	 * (TextEditor takes both back as soon as the focus falls free). Nothing on
	 * screen says the slider holds it either: it draws no focus ring. Editing from
	 * the keyboard is unaffected — a press on the slider focuses it again, and the
	 * arrow keys arrive before any pointerup.
	 */
	const handleSliderPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
		e.currentTarget.blur();
	};

	// Commits on key release, or on blur when focus leaves before a keyup arrives.
	// A held key thus becomes many previews plus one commit, matching drag/dragEnd.
	const commitKeyboardEdit = () => {
		const committedValue = uncommittedKeyboardValue.current;
		isKeyboardEditing.current = false;
		uncommittedKeyboardValue.current = null;
		if (committedValue !== null) {
			onPropertyUpdate?.(property, committedValue, true, true);
		}
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
				setInputValue(agreedText);
			}
		},
		[min, max, trackMin, trackMax, property, agreedText, onPropertyUpdate],
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
		if (agreedText !== inputValueRef.current) {
			setSliderValue(clamp(value, trackMin, trackMax));
			setInputValue(agreedText);
			pendingCommit.current = false;
		}
	}, [agreedText, value, trackMin, trackMax]);

	return (
		<ObjectMenuSliderWrapper>
			<ObjectMenuSliderFooter>
				<ObjectMenuSliderLabel>{label}</ObjectMenuSliderLabel>
				<ObjectMenuSliderNumberInput
					type="number"
					min={min}
					max={max}
					value={inputValue}
					placeholder={
						isMixed ? messages.propertyPanelMixedPlaceholder : undefined
					}
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
				isMixed={isMixed}
				onChange={handleSliderChange}
				onKeyDown={handleSliderKeyDown}
				onKeyUp={commitKeyboardEdit}
				onBlur={commitKeyboardEdit}
				onPointerUp={handleSliderPointerUp}
				data-kind="menu"
				data-id="object-menu"
				data-part={sliderPart(property)}
				data-gesture="native-pointer"
			/>
		</ObjectMenuSliderWrapper>
	);
};

export const ObjectMenuSlider = memo(ObjectMenuSliderComponent);

import { memo, useEffect, useRef, useState } from "react";

import {
	PropertyNumberFieldInput,
	PropertyNumberFieldPrefix,
	PropertyNumberFieldRoot,
	PropertyNumberFieldSpinButton,
	PropertyNumberFieldSpinner,
	PropertyNumberFieldUnit,
} from "./PropertyControlsStyled";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { ChevronDownIcon } from "../../../icons/ChevronDownIcon";

/** Decimals a value is shown with; enough to read a snapped position back. */
const DISPLAY_DECIMALS = 1;

/** What one arrow-key press or spin-button click moves the value by, and what Shift multiplies it to. */
const ARROW_STEP = 1;
const SHIFT_ARROW_STEP = 10;

const SPIN_ICON_SIZE = 10;

/**
 * Applies one edit of a number field.
 *
 * @param value - The value the field now states, already clamped
 * @param commit - true records it in history (blur / Enter / key release), false only previews it live
 * @param coalesceHistory - true merges this commit into the preceding one for the same field, so arrow-key repeat becomes a single undo entry
 */
export type PropertyNumberUpdater = (
	value: number,
	commit: boolean,
	coalesceHistory?: boolean,
) => void;

type PropertyNumberFieldProps = {
	/** The value the selection currently has; an external change resets what is typed. */
	value: number;
	/**
	 * Whether the selection carries several values. The field is then drawn empty
	 * with a muted dash as its placeholder, `value` being only one object's
	 * number; typing still commits to the whole selection, which is what brings it
	 * back to one value.
	 */
	isMixed?: boolean;
	/** Letter drawn inside the left edge, naming what the field states (X / Y / W / H). */
	prefix?: string;
	/** Unit drawn inside the right edge (° for an angle, % for an opacity). */
	unit?: string;
	/** Lower bound the typed value is clamped to. Omitted leaves it unbounded. */
	min?: number;
	/** Upper bound the typed value is clamped to. Omitted leaves it unbounded. */
	max?: number;
	/** aria-label of the input, since the row's label does not name a single field of a pair. */
	ariaLabel: string;
	/** Value of `data-testid`, which is how e2e reaches one field of a pair. */
	testId: string;
	onUpdate: PropertyNumberUpdater;
};

const clamp = (value: number, min?: number, max?: number): number => {
	const lowered = min === undefined ? value : Math.max(min, value);
	return max === undefined ? lowered : Math.min(max, lowered);
};

/** Trailing zeros dropped, so a whole number reads as one. */
const formatValue = (value: number): string =>
	String(Number(value.toFixed(DISPLAY_DECIMALS)));

/**
 * A number stated by hand: the selection's own value, editable in place.
 *
 * Typing previews live and commits on blur or Enter, the way the menu's sliders
 * do; Escape puts the value the field was given back and gives up the focus.
 * The arrow keys and the up/down buttons at the right edge step by 1 (10 with
 * Shift) and commit each step as part of the same undo entry, so holding a key
 * down or clicking a button repeatedly is undone in a single press.
 *
 * A selection carrying several values (`isMixed`) leaves the field empty behind
 * its placeholder, and the arrow keys then step from `value` — one object's
 * number, which is the only one there is to step from.
 *
 * Opted out of the gesture system (`data-gesture="none"`), so the keystrokes
 * reach the input rather than the canvas shortcuts.
 */
const PropertyNumberFieldComponent: React.FC<PropertyNumberFieldProps> = ({
	value,
	isMixed = false,
	prefix,
	unit,
	min,
	max,
	ariaLabel,
	testId,
	onUpdate,
}) => {
	const messages = useCanvasMessages();
	// What the field agrees with the selection on: empty while the selection
	// disagrees, so no one object's number is shown as the selection's.
	const agreedText = isMixed ? "" : formatValue(value);
	const [inputValue, setInputValue] = useState(agreedText);
	// Read after render by the effect below, which must compare against what the
	// user has typed rather than what the last render closed over.
	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;
	// Whether a parsable edit has been previewed but not yet committed.
	const pendingCommit = useRef(false);
	// The value to put back on Escape: what the field last agreed with the
	// selection on, which a commit moves forward. Kept as both the number the
	// arrow keys step from and the text shown, which are not the same thing while
	// the selection disagrees.
	const revertValue = useRef(value);
	const revertText = useRef(agreedText);

	// Reset only when the agreed text differs from what is typed, treating that
	// as an external change (a handle drag, an undo). A commit:false preview also
	// changes `value`, but it then matches inputValue and is skipped.
	useEffect(() => {
		if (agreedText !== inputValueRef.current) {
			setInputValue(agreedText);
			pendingCommit.current = false;
		}
		if (!pendingCommit.current) {
			revertValue.current = value;
			revertText.current = agreedText;
		}
	}, [agreedText, value]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
		setInputValue(event.target.value);
		const parsed = Number.parseFloat(event.target.value);
		if (Number.isFinite(parsed)) {
			pendingCommit.current = true;
			onUpdate(clamp(parsed, min, max), false);
		}
	};

	const commit = (): void => {
		const parsed = Number.parseFloat(inputValue);
		if (!Number.isFinite(parsed)) {
			setInputValue(revertText.current);
			pendingCommit.current = false;
			return;
		}
		const committed = clamp(parsed, min, max);
		setInputValue(formatValue(committed));
		if (pendingCommit.current) {
			onUpdate(committed, true);
			pendingCommit.current = false;
			revertValue.current = committed;
			revertText.current = formatValue(committed);
		}
	};

	const step = (delta: number): void => {
		const parsed = Number.parseFloat(inputValue);
		const base = Number.isFinite(parsed) ? parsed : revertValue.current;
		const stepped = clamp(base + delta, min, max);
		setInputValue(formatValue(stepped));
		pendingCommit.current = false;
		revertValue.current = stepped;
		revertText.current = formatValue(stepped);
		// Against a bound the step goes nowhere, and a commit of the value already
		// held would be recorded as an entry that changes nothing.
		if (stepped !== base) {
			onUpdate(stepped, true, true);
		}
	};

	const handleKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
	): void => {
		if (event.key === "Enter") {
			commit();
			event.currentTarget.blur();
			return;
		}
		if (event.key === "Escape") {
			const reverted = revertValue.current;
			setInputValue(revertText.current);
			if (pendingCommit.current) {
				// The preview is undone by previewing the original back: nothing was
				// recorded, so the history never saw the abandoned edit at all.
				onUpdate(reverted, false);
				pendingCommit.current = false;
			}
			event.currentTarget.blur();
			return;
		}
		if (event.key === "ArrowUp" || event.key === "ArrowDown") {
			event.preventDefault();
			const magnitude = event.shiftKey ? SHIFT_ARROW_STEP : ARROW_STEP;
			step(event.key === "ArrowUp" ? magnitude : -magnitude);
		}
	};

	const handleSpinClick = (
		event: React.MouseEvent<HTMLButtonElement>,
		direction: 1 | -1,
	): void => {
		step(direction * (event.shiftKey ? SHIFT_ARROW_STEP : ARROW_STEP));
	};

	// The focus stays where it is (on the input, if there): moving it to the
	// button would blur the input and reformat what is being typed.
	const keepFocus = (event: React.MouseEvent<HTMLButtonElement>): void => {
		event.preventDefault();
	};

	return (
		<PropertyNumberFieldRoot data-gesture="none">
			{prefix !== undefined && (
				<PropertyNumberFieldPrefix>{prefix}</PropertyNumberFieldPrefix>
			)}
			<PropertyNumberFieldInput
				type="text"
				inputMode="decimal"
				value={inputValue}
				placeholder={
					isMixed ? messages.propertyPanelMixedPlaceholder : undefined
				}
				aria-label={ariaLabel}
				data-testid={testId}
				onChange={handleChange}
				onBlur={commit}
				onKeyDown={handleKeyDown}
			/>
			{unit !== undefined && (
				<PropertyNumberFieldUnit>{unit}</PropertyNumberFieldUnit>
			)}
			<PropertyNumberFieldSpinner>
				<PropertyNumberFieldSpinButton
					type="button"
					direction="up"
					tabIndex={-1}
					aria-label={messages.propertyPanelStepUp}
					title={messages.propertyPanelStepUp}
					onMouseDown={keepFocus}
					onClick={(event) => handleSpinClick(event, 1)}
				>
					<ChevronDownIcon width={SPIN_ICON_SIZE} height={SPIN_ICON_SIZE} />
				</PropertyNumberFieldSpinButton>
				<PropertyNumberFieldSpinButton
					type="button"
					direction="down"
					tabIndex={-1}
					aria-label={messages.propertyPanelStepDown}
					title={messages.propertyPanelStepDown}
					onMouseDown={keepFocus}
					onClick={(event) => handleSpinClick(event, -1)}
				>
					<ChevronDownIcon width={SPIN_ICON_SIZE} height={SPIN_ICON_SIZE} />
				</PropertyNumberFieldSpinButton>
			</PropertyNumberFieldSpinner>
		</PropertyNumberFieldRoot>
	);
};

export const PropertyNumberField = memo(PropertyNumberFieldComponent);

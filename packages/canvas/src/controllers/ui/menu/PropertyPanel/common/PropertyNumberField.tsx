import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
	PropertyNumberFieldInput,
	PropertyNumberFieldPrefix,
	PropertyNumberFieldRoot,
	PropertyNumberFieldSpinButton,
	PropertyNumberFieldSpinner,
	PropertyNumberFieldUnit,
} from "./PropertyControlsStyled";
import { useCommitOnOutsidePointerDown } from "./useCommitOnOutsidePointerDown";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { ChevronDownIcon } from "../../../icons/ChevronDownIcon";

/** Decimals a value is shown with; enough to read a snapped position back. */
const DISPLAY_DECIMALS = 1;

/** What one arrow-key press or spin-button click moves the value by, and what Shift multiplies it to. */
const ARROW_STEP = 1;
const SHIFT_ARROW_STEP = 10;

/** How long a spin button is held before it repeats, and the interval it then steps at. */
const SPIN_REPEAT_DELAY_MS = 350;
const SPIN_REPEAT_INTERVAL_MS = 70;

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
 * Typing previews live and commits on blur, on Enter, or on the next press
 * outside the field (a press on the canvas moves no focus, so no blur follows
 * it), the way the menu's sliders do; Escape puts the value the field was given
 * back and gives up the focus.
 * The arrow keys and the up/down buttons at the right edge step by 1 (10 with
 * Shift) and commit each step as part of the same undo entry, so holding a key
 * down or clicking a button repeatedly is undone in a single press. A button
 * held down keeps stepping at a fixed interval, the way a held arrow key does.
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
	// Tells the field's own presses apart from the ones that end the edit.
	const rootRef = useRef<HTMLDivElement>(null);
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
	// Whether the preview the field just asked for has yet to come back. What
	// comes back is no evidence of where it came from — the row states the value
	// on a scale of its own and rounds it on the way through (percent over 0..1),
	// so a preview of 50.5 returns as 51 — and only having asked for it is.
	const awaitingPreviewEcho = useRef(false);
	// The value to put back on Escape: what the field last agreed with the
	// selection on, which a commit moves forward. Kept as both the number the
	// arrow keys step from and the text shown, which are not the same thing while
	// the selection disagrees.
	const revertValue = useRef(value);
	const revertText = useRef(agreedText);
	// Timers of the spin button being held: the wait before the run starts, then
	// the run itself.
	const spinRepeatDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const spinRepeatIntervalTimer = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);

	// Reset only on a change from outside (a handle drag, an undo, a host sync).
	// The field's own preview comes back through here as well, and writing its
	// text over what is being typed would cut the number short at the digit the
	// display rounds to ("12.75" reset to "12.8", the next digits landing after
	// it), so that one change is let through untouched.
	useEffect(() => {
		if (awaitingPreviewEcho.current) {
			awaitingPreviewEcho.current = false;
		} else if (agreedText !== inputValueRef.current) {
			setInputValue(agreedText);
			pendingCommit.current = false;
		}
		if (!pendingCommit.current) {
			revertValue.current = value;
			revertText.current = agreedText;
		}
	}, [agreedText, value]);

	// Declared after the effect above, which is the one render the preview is
	// awaited for: the value and the text it was typed into land in the same
	// render, so a preview still awaited on the next one never came back at all
	// (the row settled on the value the field already stated) and must not be
	// taken for a later change from outside.
	useEffect(() => {
		awaitingPreviewEcho.current = false;
	});

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
		setInputValue(event.target.value);
		const parsed = Number.parseFloat(event.target.value);
		if (Number.isFinite(parsed)) {
			pendingCommit.current = true;
			awaitingPreviewEcho.current = true;
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
		// Once the edit is over the field states what the row settled on rather
		// than what was typed towards it: the preview has already been through the
		// row, which may state the value on a scale of its own and round it there
		// (50.5 percent of an opacity is stated as 51). While the selection
		// disagrees there is no agreed text to state, so the number committed to
		// all of it stands in.
		const committedText = isMixed ? formatValue(committed) : agreedText;
		setInputValue(committedText);
		if (pendingCommit.current) {
			onUpdate(committed, true);
			pendingCommit.current = false;
			revertValue.current = committed;
			revertText.current = committedText;
		}
	};

	// A press outside the field ends the edit the way a blur would, but ahead of
	// the canvas acting on it: the gesture layer keeps the focus here, so a
	// deselect drops the row without the blur that would have committed.
	useCommitOnOutsidePointerDown(rootRef, () => {
		if (pendingCommit.current) {
			commit();
		}
	});

	/** Steps from a base already chosen, and states where it landed. */
	const stepFrom = (base: number, delta: number): number => {
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
		return stepped;
	};

	/** Steps from what is typed, falling back to the value last agreed on. */
	const step = (delta: number): void => {
		const parsed = Number.parseFloat(inputValue);
		stepFrom(Number.isFinite(parsed) ? parsed : revertValue.current, delta);
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

	// The focus stays where it is (on the input, if there): moving it to the
	// button would blur the input and reformat what is being typed. Both events
	// are prevented, since a prevented pointerdown suppresses the mousedown
	// itself in some browsers and only its focus default in others.
	const keepFocus = (event: React.MouseEvent<HTMLButtonElement>): void => {
		event.preventDefault();
	};

	const stopSpinRepeat = useCallback((): void => {
		if (spinRepeatDelayTimer.current !== null) {
			clearTimeout(spinRepeatDelayTimer.current);
			spinRepeatDelayTimer.current = null;
		}
		if (spinRepeatIntervalTimer.current !== null) {
			clearInterval(spinRepeatIntervalTimer.current);
			spinRepeatIntervalTimer.current = null;
		}
	}, []);

	// A button held while the field goes away (the selection changes, an undo)
	// never sees its release.
	useEffect(() => stopSpinRepeat, [stopSpinRepeat]);

	const handleSpinPointerDown = (
		event: React.PointerEvent<HTMLButtonElement>,
		direction: 1 | -1,
	): void => {
		keepFocus(event);
		if (event.button !== 0) {
			return;
		}
		// Read once: releasing Shift during the hold does not change the run's stride.
		const delta = direction * (event.shiftKey ? SHIFT_ARROW_STEP : ARROW_STEP);
		step(delta);
		stopSpinRepeat();
		spinRepeatDelayTimer.current = setTimeout(() => {
			spinRepeatDelayTimer.current = null;
			spinRepeatIntervalTimer.current = setInterval(() => {
				// The ref carries the run forward; the inputValue this handler closed
				// over stays at the value the field held when the button went down.
				const base = revertValue.current;
				if (stepFrom(base, delta) === base) {
					stopSpinRepeat();
				}
			}, SPIN_REPEAT_INTERVAL_MS);
		}, SPIN_REPEAT_DELAY_MS);
	};

	return (
		<PropertyNumberFieldRoot ref={rootRef} data-gesture="none">
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
					onPointerDown={(event) => handleSpinPointerDown(event, 1)}
					onPointerUp={stopSpinRepeat}
					onPointerLeave={stopSpinRepeat}
					onPointerCancel={stopSpinRepeat}
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
					onPointerDown={(event) => handleSpinPointerDown(event, -1)}
					onPointerUp={stopSpinRepeat}
					onPointerLeave={stopSpinRepeat}
					onPointerCancel={stopSpinRepeat}
				>
					<ChevronDownIcon width={SPIN_ICON_SIZE} height={SPIN_ICON_SIZE} />
				</PropertyNumberFieldSpinButton>
			</PropertyNumberFieldSpinner>
		</PropertyNumberFieldRoot>
	);
};

export const PropertyNumberField = memo(PropertyNumberFieldComponent);

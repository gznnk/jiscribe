import { memo, useEffect, useRef, useState } from "react";

import {
	PropertyTextFieldInput,
	PropertyTextFieldRoot,
	PropertyTextFieldTextarea,
} from "./PropertyControlsStyled";

/**
 * Applies one edit of a text field.
 *
 * @param value - The text the field now states, as typed
 * @param commit - true records it in history (blur / Enter), false only previews it live
 */
export type PropertyTextUpdater = (value: string, commit: boolean) => void;

type PropertyTextFieldProps = {
	/** The text the selection currently holds; an external change resets what is typed. */
	value: string;
	/** true draws a resizable textarea, where Enter is a newline and Ctrl/Cmd+Enter commits. */
	multiline?: boolean;
	/** Shown while the field is empty, naming what the field would state. Omitted leaves it blank. */
	placeholder?: string;
	/** aria-label of the input, since a row's label column can be shared or empty. */
	ariaLabel: string;
	/** Value of `data-testid`, which is how e2e reaches one field of a section. */
	testId: string;
	onUpdate: PropertyTextUpdater;
};

/**
 * Text stated by hand: the selection's own value, editable in place.
 *
 * Typing previews live and commits on blur or Enter, the way the number fields
 * beside it do; Escape puts the text the field was given back and gives up the
 * focus. A multiline field keeps Enter for the newline, so Ctrl/Cmd+Enter is
 * what commits it there.
 *
 * Opted out of the gesture system (`data-gesture="none"`), so a press lands in
 * the field rather than on the canvas; the keystrokes reach it because the
 * shortcut listener leaves form fields to themselves (useKeyboardShortcuts).
 */
const PropertyTextFieldComponent: React.FC<PropertyTextFieldProps> = ({
	value,
	multiline = false,
	placeholder,
	ariaLabel,
	testId,
	onUpdate,
}) => {
	const [inputValue, setInputValue] = useState(value);
	// Read after render by the effect below, which must compare against what the
	// user has typed rather than what the last render closed over.
	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;
	// Whether an edit has been previewed but not yet committed.
	const pendingCommit = useRef(false);
	// The text to put back on Escape: what the field last agreed with the
	// selection on, which a commit moves forward.
	const revertText = useRef(value);

	// Reset only when the given value differs from what is typed, treating that
	// as an external change (an undo, another object selected). A commit:false
	// preview also changes `value`, but it then matches inputValue and is skipped.
	useEffect(() => {
		if (value !== inputValueRef.current) {
			setInputValue(value);
			pendingCommit.current = false;
		}
		if (!pendingCommit.current) {
			revertText.current = value;
		}
	}, [value]);

	const handleChange = (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	): void => {
		setInputValue(event.target.value);
		pendingCommit.current = true;
		onUpdate(event.target.value, false);
	};

	const commit = (): void => {
		if (!pendingCommit.current) {
			return;
		}
		onUpdate(inputValue, true);
		pendingCommit.current = false;
		revertText.current = inputValue;
	};

	const handleKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
	): void => {
		if (event.key === "Escape") {
			setInputValue(revertText.current);
			if (pendingCommit.current) {
				// The preview is undone by previewing the original back: nothing was
				// recorded, so the history never saw the abandoned edit at all.
				onUpdate(revertText.current, false);
				pendingCommit.current = false;
			}
			event.currentTarget.blur();
			return;
		}
		if (event.key !== "Enter") {
			return;
		}
		// A bare Enter belongs to the textarea, which is what the modifier is for.
		if (multiline && !(event.ctrlKey || event.metaKey)) {
			return;
		}
		event.preventDefault();
		commit();
		event.currentTarget.blur();
	};

	return (
		<PropertyTextFieldRoot data-gesture="none">
			{multiline ? (
				<PropertyTextFieldTextarea
					value={inputValue}
					placeholder={placeholder}
					aria-label={ariaLabel}
					data-testid={testId}
					onChange={handleChange}
					onBlur={commit}
					onKeyDown={handleKeyDown}
				/>
			) : (
				<PropertyTextFieldInput
					type="text"
					value={inputValue}
					placeholder={placeholder}
					aria-label={ariaLabel}
					data-testid={testId}
					onChange={handleChange}
					onBlur={commit}
					onKeyDown={handleKeyDown}
				/>
			)}
		</PropertyTextFieldRoot>
	);
};

export const PropertyTextField = memo(PropertyTextFieldComponent);

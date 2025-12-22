import type React from "react";
import { memo, useEffect, useRef } from "react";

import { Input, TextArea } from "./TextEditorStyled";
import type { TextEditorProps } from "./TextEditorTypes";
import { newEventId } from "../../../../utils/core/newEventId";
import { degreesToRadians } from "../../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../../utils/shapes/common/createSvgTransform";

/**
 * TextEditor component.
 */
const TextEditorComponent: React.FC<TextEditorProps> = ({
	id,
	text,
	x,
	y,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	textType,
	textAlign,
	verticalAlign,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	isActive,
	onTextChange,
}) => {
	const prevIsActive = useRef(isActive);
	// Refs for input and textarea elements.
	// These refs are used to focus the input or textarea when the component is active.
	const inputRef = useRef<HTMLInputElement>(null);
	const textAreaRef = useRef<HTMLTextAreaElement>(null);

	// Focus the input or textarea when the component is active.
	useEffect(() => {
		if (prevIsActive.current === false && isActive) {
			if (textType === "text") {
				inputRef.current?.focus();
				// Set the selection range to the end of the text in the input.
				inputRef.current?.setSelectionRange(text.length, text.length);
			} else {
				textAreaRef.current?.focus();
				// Set the selection range to the end of the text in the textarea.
				textAreaRef.current?.setSelectionRange(text.length, text.length);
			}
		}
		prevIsActive.current = isActive;
	}, [isActive, text, textType]);

	// Hide the thext editor when not active.
	if (!isActive) return null;

	/**
	 * Handle text change event for textarea.
	 */
	const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onTextChange?.({
			eventId: newEventId(),
			eventPhase: "InProgress",
			id,
			text: e.target.value,
		});
	};

	/**
	 * Handle blur event for textarea.
	 */
	const handleTextAreaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
		onTextChange?.({
			eventId: newEventId(),
			eventPhase: "Ended",
			id,
			text: e.target.value,
		});
	};

	/**
	 * Handle text change event for input.
	 */
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onTextChange?.({
			eventId: newEventId(),
			eventPhase: "InProgress",
			id,
			text: e.target.value,
		});
	};

	/**
	 * Handle blur event for input.
	 */
	const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		onTextChange?.({
			eventId: newEventId(),
			eventPhase: "Ended",
			id,
			text: e.target.value,
		});
	};

	// Transform for the element.
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	// Commom properties for both input and textarea.
	const commonProps = {
		value: text,
		left: -width / 2,
		top: -height / 2,
		transform,
		width,
		height,
		textAlign,
		verticalAlign,
		color: fontColor,
		fontSize,
		fontFamily,
		fontWeight,
	};

	return textType === "text" ? (
		<Input
			{...commonProps}
			// Additional properties for input.
			type="text"
			ref={inputRef}
			onChange={handleInputChange}
			onBlur={handleInputBlur}
		/>
	) : (
		<TextArea
			{...commonProps}
			// Additional properties for textarea.
			ref={textAreaRef}
			onChange={handleTextAreaChange}
			onBlur={handleTextAreaBlur}
		/>
	);
};

export const TextEditor = memo(TextEditorComponent);

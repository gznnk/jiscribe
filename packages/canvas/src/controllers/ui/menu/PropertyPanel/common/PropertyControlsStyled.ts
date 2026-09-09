import styled from "@emotion/styled";

import { theme } from "../../../../../constants/theme";

/** Height every control in the panel is drawn at, so rows line up. */
const CONTROL_HEIGHT = "28px";

/** Wrapper of a number field: the input, the letter or unit drawn inside it, and the spin buttons at its right edge. */
export const PropertyNumberFieldRoot = styled.div`
	position: relative;
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	height: ${CONTROL_HEIGHT};
	box-sizing: border-box;
	border: 1px solid ${theme.inputBorder};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};
	/* Keeps the spin buttons' hover fill inside the rounded corners. */
	overflow: hidden;

	&:hover {
		border-color: ${theme.foregroundMuted};
	}

	&:focus-within {
		border-color: ${theme.accent};
		box-shadow: 0 0 0 1px ${theme.accent};
	}
`;

/** The letter naming the axis a field states (X / Y / W / H). */
export const PropertyNumberFieldPrefix = styled.span`
	flex: none;
	padding-left: 6px;
	font-size: 11px;
	color: ${theme.foregroundMuted};
	user-select: none;
`;

/** The unit a field's value is read in (°). */
export const PropertyNumberFieldUnit = styled.span`
	flex: none;
	padding-right: 6px;
	font-size: 11px;
	color: ${theme.foregroundMuted};
	user-select: none;
`;

export const PropertyNumberFieldInput = styled.input`
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0 6px;
	border: none;
	background: transparent;
	color: ${theme.inputFg};
	font-size: 12px;
	outline: none;

	/* Only ever shown for a value the selection disagrees on, where the field is
	   left empty on purpose — muted so the dash is not read as a typed value. */
	&::placeholder {
		color: ${theme.inputPlaceholder};
	}
`;

/** The up/down column at the right edge of a number field. */
export const PropertyNumberFieldSpinner = styled.div`
	flex: none;
	display: flex;
	flex-direction: column;
	align-self: stretch;
	width: 16px;
	border-left: 1px solid ${theme.inputBorder};
`;

/** One half of the spinner; the chevron is the icon rotated, so up and down share it. */
export const PropertyNumberFieldSpinButton = styled.button<{
	direction: "up" | "down";
}>`
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 0;
	padding: 0;
	border: none;
	background: transparent;
	color: ${theme.foregroundMuted};
	cursor: pointer;

	& > svg {
		transform: ${({ direction }) =>
			direction === "up" ? "rotate(180deg)" : "none"};
	}

	&:hover {
		background: ${theme.surfaceHover};
		color: ${theme.foreground};
	}
`;

/** The button a dropdown field opens from: a preview plus a chevron. */
export const PropertyDropdownTrigger = styled.button`
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 6px;
	height: ${CONTROL_HEIGHT};
	padding: 0 6px;
	box-sizing: border-box;
	border: 1px solid ${theme.inputBorder};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};
	color: ${theme.inputFg};
	font-size: 12px;
	text-align: left;
	cursor: pointer;

	&:hover {
		border-color: ${theme.accent};
	}
`;

/**
 * Positioning context of a dropdown field, and the column its open panel is
 * stacked into: the panel drops into the flow rather than floating, so the
 * sidebar's scrolling body cannot clip it.
 */
export const PropertyDropdownFieldRoot = styled.div`
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: stretch;
`;

/**
 * The chevron of a dropdown trigger. Pushed to the right edge whatever the
 * preview is, so a preview with no text of its own (an arrow-head mark) does
 * not leave the chevron hanging beside it.
 */
export const PropertyDropdownChevron = styled.span`
	flex: none;
	display: flex;
	margin-left: auto;
`;

/** Text of a dropdown trigger; ellipsised rather than widening the panel. */
export const PropertyDropdownTriggerLabel = styled.span`
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

/** The box every swatch is drawn in, whatever it is filled with. */
const SWATCH_BOX = `
	flex: none;
	width: 20px;
	height: 20px;
	box-sizing: border-box;
	border: 1px solid ${theme.borderSubtle};
	border-radius: ${theme.radius};
`;

/**
 * The color a swatch shows. `transparent` draws the checker instead, so an
 * unfilled shape is not mistaken for a white one.
 */
export const PropertyColorSwatch = styled.span<{ swatchColor: string }>`
	${SWATCH_BOX}
	background: ${({ swatchColor }) =>
		swatchColor === "transparent"
			? `repeating-conic-gradient(${theme.transparentChecker} 0% 25%, transparent 0% 50%) 50% / 8px 8px`
			: swatchColor};
`;

/**
 * Stands in for the swatch where the selection carries several colors. Hatched
 * rather than filled: any single color would read as the one the row states.
 */
export const PropertyColorMixedSwatch = styled.span`
	${SWATCH_BOX}
	background: repeating-linear-gradient(
		45deg,
		${theme.foregroundMuted} 0 2px,
		${theme.inputBg} 2px 5px
	);
`;

/** The resolved color of an `auto` swatch, named rather than spelled out in hex. */
export const PropertyColorAutoLabel = styled.span`
	color: ${theme.foregroundMuted};
`;

/** The word standing in for a value the selection does not agree on. */
export const PropertyMixedLabel = styled.span`
	color: ${theme.foregroundMuted};
`;

/** Row of segment buttons, sharing the width of the control column. */
export const PropertySegmentedControlRoot = styled.div`
	flex: 1;
	min-width: 0;
	display: flex;
	gap: 2px;
`;

export const PropertySegmentButton = styled.button<{ isActive: boolean }>`
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	height: ${CONTROL_HEIGHT};
	padding: 0;
	box-sizing: border-box;
	border: 1px solid
		${({ isActive }) => (isActive ? theme.accent : "transparent")};
	border-radius: ${theme.radius};
	background: ${({ isActive }) =>
		isActive ? theme.surfaceActive : "transparent"};
	color: ${theme.foreground};
	font-size: 11px;
	cursor: pointer;

	&:hover {
		background: ${theme.surfaceHover};
	}
`;

/**
 * The pressable row of a checkbox: the box and its label together, so the label
 * is as much a target as the box. A whole row of the section rather than a
 * control beside a label, so it starts at the section's left edge.
 */
export const PropertyCheckboxButton = styled.button`
	display: flex;
	align-items: flex-start;
	gap: 8px;
	width: 100%;
	min-height: ${CONTROL_HEIGHT};
	padding: 5px 0;
	box-sizing: border-box;
	border: none;
	background: transparent;
	color: ${theme.foreground};
	font-size: 11px;
	text-align: left;
	cursor: pointer;
`;

/** The box of a checkbox; filled with the accent while on, the check drawn in it. */
export const PropertyCheckboxBox = styled.span<{ isOn: boolean }>`
	flex: none;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	box-sizing: border-box;
	border: 1px solid ${({ isOn }) => (isOn ? theme.accent : theme.inputBorder)};
	border-radius: 3px;
	background: ${({ isOn }) => (isOn ? theme.accent : theme.inputBg)};
	color: ${theme.surface};
	transition: background-color 0.15s ease;
`;

/** Label of a checkbox. Wraps rather than ellipsising: it is the only thing naming the setting. */
export const PropertyCheckboxLabel = styled.span`
	flex: 1;
	min-width: 0;
	line-height: 18px;
`;

/** Two columns of command buttons filling the section's width. */
export const PropertyCommandGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px;
	width: 100%;
`;

/** A command stated by an icon alone, kept square at the height every control is drawn at. */
export const PropertyIconButton = styled.button`
	flex: none;
	display: flex;
	align-items: center;
	justify-content: center;
	width: ${CONTROL_HEIGHT};
	height: ${CONTROL_HEIGHT};
	padding: 0;
	box-sizing: border-box;
	border: 1px solid ${theme.inputBorder};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};
	color: ${theme.foreground};
	cursor: pointer;

	&:hover {
		background: ${theme.surfaceHover};
	}
`;

/** A command stated by its name; disabled while the command cannot run on the selection. */
export const PropertyCommandButton = styled.button`
	min-width: 0;
	height: ${CONTROL_HEIGHT};
	padding: 0 8px;
	box-sizing: border-box;
	border: 1px solid ${theme.inputBorder};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};
	color: ${theme.foreground};
	font-size: 11px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	cursor: pointer;

	&:hover:not(:disabled) {
		background: ${theme.surfaceHover};
	}

	&:disabled {
		color: ${theme.foregroundMuted};
		cursor: default;
	}
`;

/** Wrapper of a text field, drawn as a number field's box without the spinner column. */
export const PropertyTextFieldRoot = styled.div`
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	box-sizing: border-box;
	border: 1px solid ${theme.inputBorder};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};

	&:hover {
		border-color: ${theme.foregroundMuted};
	}

	&:focus-within {
		border-color: ${theme.accent};
		box-shadow: 0 0 0 1px ${theme.accent};
	}
`;

/** The single-line input of a text field; the typography of a number field's own. */
export const PropertyTextFieldInput = styled.input`
	flex: 1;
	min-width: 0;
	height: ${CONTROL_HEIGHT};
	padding: 0 6px;
	box-sizing: border-box;
	border: none;
	background: transparent;
	color: ${theme.inputFg};
	font-size: 12px;
	outline: none;

	&::placeholder {
		color: ${theme.inputPlaceholder};
	}
`;

/**
 * The multi-line input of a text field. Tall enough for a few lines and resizable
 * downwards only, so dragging it cannot widen the sidebar it sits in.
 */
export const PropertyTextFieldTextarea = styled.textarea`
	flex: 1;
	min-width: 0;
	min-height: 64px;
	padding: 5px 6px;
	box-sizing: border-box;
	border: none;
	background: transparent;
	color: ${theme.inputFg};
	font-family: inherit;
	font-size: 12px;
	line-height: 1.4;
	resize: vertical;
	outline: none;

	&::placeholder {
		color: ${theme.inputPlaceholder};
	}
`;

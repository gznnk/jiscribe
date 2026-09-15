import { memo } from "react";

import {
	PropertyCheckboxBox,
	PropertyCheckboxButton,
	PropertyCheckboxLabel,
} from "./PropertyControlsStyled";

const CHECK_ICON_SIZE = 12;

type PropertyCheckboxProps = {
	/** Whether the selection is already in the state the box stands for. */
	isOn: boolean;
	/**
	 * The `data-part` the press carries, in the grammar ObjectMenuHandler
	 * resolves: `set:{property}:{value}` for a flag written outright,
	 * `command:{commandId}` for a flag the canvas computes the next state of.
	 */
	part: string;
	/**
	 * Text beside the box. Names the state the box stands for ("Lock Aspect
	 * Ratio"), the same words the ObjectMenu's button uses, so the two read as
	 * one setting; it does not change with `isOn`.
	 */
	label: string;
	/** title of the control; says what the press will do, not what is set. Defaults to `label`. */
	title?: string;
};

/**
 * An on/off control for the flags that have no value to type: the aspect-ratio
 * lock, the height that follows the text, the width the text wraps in. Drawn as
 * a box with its label to the right, the whole row pressable. Placed directly in
 * a section rather than in a PropertyRow: the label is its own, so it takes the
 * row's full width from the section's left edge.
 *
 * Writes through the gesture system like the ObjectMenu's own toggles, so the
 * press lands one history entry.
 */
const PropertyCheckboxComponent: React.FC<PropertyCheckboxProps> = ({
	isOn,
	part,
	label,
	title = label,
}) => (
	<PropertyCheckboxButton
		type="button"
		role="checkbox"
		aria-checked={isOn}
		title={title}
		data-kind="menu"
		data-id="object-menu"
		data-part={part}
	>
		<PropertyCheckboxBox isOn={isOn} aria-hidden="true">
			{isOn && (
				<svg
					width={CHECK_ICON_SIZE}
					height={CHECK_ICON_SIZE}
					viewBox="0 0 10 10"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.8}
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<polyline points="1.5,5.2 4,7.6 8.5,2.4" />
				</svg>
			)}
		</PropertyCheckboxBox>
		<PropertyCheckboxLabel>{label}</PropertyCheckboxLabel>
	</PropertyCheckboxButton>
);

export const PropertyCheckbox = memo(PropertyCheckboxComponent);

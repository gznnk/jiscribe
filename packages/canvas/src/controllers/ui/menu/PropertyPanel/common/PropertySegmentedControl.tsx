import { memo } from "react";

import {
	PropertySegmentButton,
	PropertySegmentedControlRoot,
} from "./PropertyControlsStyled";

/** One choice of a segmented control. */
export type PropertySegmentedOption = {
	/** Distinguishes the option within the control; not written anywhere. */
	id: string;
	/**
	 * The `data-part` the press carries, in the grammar ObjectMenuHandler
	 * resolves: `set:{property}:{value}` for a plain value, `command:{commandId}`
	 * for a toggle the canvas computes itself.
	 */
	part: string;
	/** title / aria-label of the button. */
	title: string;
	/** What the button draws: an icon, or a word for a control with no icon set. */
	content: React.ReactNode;
	/** Whether the selection is already on this option. */
	isActive: boolean;
};

type PropertySegmentedControlProps = {
	/** The choices, drawn side by side in this order. */
	options: readonly PropertySegmentedOption[];
	/**
	 * Whether the selection carries several values. No segment is then drawn
	 * active, whatever the options say — one of them would otherwise claim the
	 * whole selection is on it. A press writes to the whole selection unchanged,
	 * which is what brings it to the one value.
	 */
	isMixed?: boolean;
};

/**
 * A row of mutually visible choices, each writing straight through the gesture
 * system (`data-kind="menu" data-id="object-menu"`), which is the same route the
 * ObjectMenu's own buttons take — so a press lands one property update and one
 * history entry, with no callback in between.
 */
const PropertySegmentedControlComponent: React.FC<
	PropertySegmentedControlProps
> = ({ options, isMixed = false }) => (
	<PropertySegmentedControlRoot>
		{options.map((option) => {
			const isActive = isMixed ? false : option.isActive;
			return (
				<PropertySegmentButton
					key={option.id}
					type="button"
					isActive={isActive}
					aria-pressed={isActive}
					title={option.title}
					aria-label={option.title}
					data-kind="menu"
					data-id="object-menu"
					data-part={option.part}
				>
					{option.content}
				</PropertySegmentButton>
			);
		})}
	</PropertySegmentedControlRoot>
);

export const PropertySegmentedControl = memo(PropertySegmentedControlComponent);

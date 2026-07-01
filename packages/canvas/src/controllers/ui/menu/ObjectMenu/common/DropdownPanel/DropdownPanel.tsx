import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { DropdownPanelRoot } from "./DropdownPanelStyled";

/**
 * Dropdown panel. Displayed center-aligned below or above the button.
 *
 * Declares the panel itself as an object-menu target so that clicking the
 * panel's padding, the gaps between buttons, or the border area does not let
 * the gesture ancestor lookup (closest("[data-kind]")) climb up to the Viewport
 * (data-kind="canvas") and fire deselection / menu close. ObjectMenuHandler does
 * nothing for unknown actionIds, so a background click is a no-op and the menu
 * and selection are retained. Inner buttons have their own data-kind, so closest
 * picks up the button first and they behave as before.
 */
export const DropdownPanel = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof DropdownPanelRoot>
>((props, ref) => (
	<DropdownPanelRoot
		ref={ref}
		data-kind="object-menu"
		data-id="object-menu:panel"
		{...props}
	/>
));
DropdownPanel.displayName = "DropdownPanel";

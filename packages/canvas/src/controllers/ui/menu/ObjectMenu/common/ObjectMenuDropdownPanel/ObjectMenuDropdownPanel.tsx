import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { ObjectMenuDropdownPanelRoot } from "./ObjectMenuDropdownPanelStyled";

type ObjectMenuDropdownPanelProps = ComponentPropsWithoutRef<
	typeof ObjectMenuDropdownPanelRoot
> & {
	/** Whether the panel opens below ("down") or above ("up") the button. */
	placement?: "down" | "up";
	/** Horizontal correction (px) applied to keep the panel within the canvas area. */
	offsetX?: number;
};

/**
 * Dropdown panel. Displayed center-aligned below or above the button.
 *
 * Must be rendered inside a menu target — the ObjectMenu, or the properties
 * sidebar it is portalled into — which a press on the panel's padding, the gaps
 * between buttons, or the border area resolves to; the panel itself carries only
 * `data-action="panel"`, which neither handler acts on, so the press leaves the
 * menu and the selection alone. The buttons inside carry their own data-action and
 * are read first.
 */
export const ObjectMenuDropdownPanel = forwardRef<
	HTMLDivElement,
	ObjectMenuDropdownPanelProps
>(({ placement = "down", offsetX = 0, style, ...props }, ref) => (
	<ObjectMenuDropdownPanelRoot
		ref={ref}
		data-action="panel"
		style={{
			...(placement === "up" ? { bottom: 40 } : { top: 40 }),
			transform: `translateX(calc(-50% + ${offsetX}px))`,
			...style,
		}}
		{...props}
	/>
));
ObjectMenuDropdownPanel.displayName = "ObjectMenuDropdownPanel";

import { type RefObject, useLayoutEffect, useRef, useState } from "react";

import { useCanvasViewportElementRef } from "../../../../CanvasViewportElementRefContext";

/**
 * Distance between the menu button and the submenu (px).
 * Corresponds to the ObjectMenuDropdownPanel CSS (top: 40px / bottom: 40px).
 */
const SUBMENU_DISTANCE = 40;

/** Minimum margin from the edges of the canvas area (px) */
const VIEWPORT_MARGIN = 8;

export type SubmenuPlacement = "down" | "up";

type SubmenuPositionResult = {
	/** ref passed to the submenu element (ObjectMenuDropdownPanel). Used to measure its actual size */
	submenuRef: RefObject<HTMLDivElement | null>;
	/** Vertical expansion direction of the submenu */
	placement: SubmenuPlacement;
	/** Horizontal correction from the button-centered position (px) */
	offsetX: number;
};

/**
 * Adjusts the submenu's display position so it does not overflow the canvas area.
 *
 * - Vertical: if expanding downward would overflow the bottom edge and there is enough space above, flip upward.
 * - Horizontal: if centering on the button would overflow left/right, shift horizontally by the overflow amount.
 *
 * Because the submenu uses position: absolute, it is clipped by the canvas root element's
 * overflow: hidden. Boundaries therefore use the canvas root element's getBoundingClientRect()
 * (browser viewport coordinates), obtained via CanvasViewportElementRefContext.
 *
 * The submenu's actual size is measured from the real DOM after rendering using useLayoutEffect
 * (applied before paint, so no flicker occurs).
 *
 * @param menuItemRef - ref of the menu button (used for position computation)
 * @param isOpen - whether the submenu is open (used to trigger recomputation)
 * @returns the submenu ref and the adjusted placement
 */
export function useSubmenuPosition(
	menuItemRef: RefObject<HTMLDivElement | null>,
	isOpen: boolean,
): SubmenuPositionResult {
	const viewportElementRef = useCanvasViewportElementRef();
	const submenuRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{
		placement: SubmenuPlacement;
		offsetX: number;
	}>({ placement: "down", offsetX: 0 });

	useLayoutEffect(() => {
		// While closed, reset to the default so the next open starts measuring from a clean state
		if (!isOpen) {
			setPosition({ placement: "down", offsetX: 0 });
			return;
		}

		const menuItemElement = menuItemRef.current;
		const submenuElement = submenuRef.current;
		if (!menuItemElement || !submenuElement) {
			return;
		}

		const buttonRect = menuItemElement.getBoundingClientRect();
		const { width: submenuWidth, height: submenuHeight } =
			submenuElement.getBoundingClientRect();

		// Rectangle of the canvas area (browser viewport coordinates).
		// Falls back to the whole browser window when outside the provider or the ref is unset.
		const viewportElement = viewportElementRef?.current ?? null;
		const areaRect = viewportElement
			? viewportElement.getBoundingClientRect()
			: {
					left: 0,
					top: 0,
					right: window.innerWidth,
					bottom: window.innerHeight,
				};

		// Vertical: check whether the bottom edge would overflow the area when shown downward
		let placement: SubmenuPlacement = "down";
		const submenuBottomIfDown =
			buttonRect.top + SUBMENU_DISTANCE + submenuHeight;
		if (submenuBottomIfDown > areaRect.bottom - VIEWPORT_MARGIN) {
			const submenuTopIfUp =
				buttonRect.bottom - SUBMENU_DISTANCE - submenuHeight;
			// Flip only when there is enough space above
			if (submenuTopIfUp >= areaRect.top + VIEWPORT_MARGIN) {
				placement = "up";
			}
		}

		// Horizontal: compute the left/right edges when centered on the button and shift by the overflow.
		// The left-edge adjustment is applied after the right-edge one, so if it cannot fit on both sides the left edge wins.
		const buttonCenterX = (buttonRect.left + buttonRect.right) / 2;
		const submenuLeftIfCentered = buttonCenterX - submenuWidth / 2;
		const submenuRightIfCentered = buttonCenterX + submenuWidth / 2;

		let offsetX = 0;
		if (submenuRightIfCentered > areaRect.right - VIEWPORT_MARGIN) {
			offsetX = areaRect.right - VIEWPORT_MARGIN - submenuRightIfCentered;
		}
		if (submenuLeftIfCentered + offsetX < areaRect.left + VIEWPORT_MARGIN) {
			offsetX = areaRect.left + VIEWPORT_MARGIN - submenuLeftIfCentered;
		}

		setPosition({ placement, offsetX });
	}, [isOpen, menuItemRef, viewportElementRef]);

	return { submenuRef, ...position };
}

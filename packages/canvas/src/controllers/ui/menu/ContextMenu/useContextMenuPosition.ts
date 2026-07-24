import { type RefObject, useLayoutEffect, useState } from "react";

import { useCanvasViewportElementRef } from "../../../CanvasViewportElementRefContext";

/** Minimum margin from the edges of the canvas area (px) */
const VIEWPORT_MARGIN = 8;

type ContextMenuPosition = {
	clientX: number;
	clientY: number;
};

type AdjustedMenuPosition = {
	left: number;
	top: number;
};

/**
 * Computes the menu's display coordinate for a single axis.
 *
 * If expanding in the positive direction (right/down) from the click coordinate would overflow the
 * display area, flip to the negative direction (left/up); if it still does not fit, clamp within the
 * display area.
 *
 * @param clickCoord - click coordinate (clientX or clientY)
 * @param menuSize - actual size of the menu (width or height)
 * @param areaStartCoord - start coordinate of the display area (left or top)
 * @param areaEndCoord - end coordinate of the display area (right or bottom)
 * @returns the adjusted coordinate (left or top)
 */
function calcAdjustedAxisCoord(
	clickCoord: number,
	menuSize: number,
	areaStartCoord: number,
	areaEndCoord: number,
): number {
	let adjustedCoord = clickCoord;

	// If it overflows in the positive direction, flip to the negative direction
	if (clickCoord + menuSize > areaEndCoord - VIEWPORT_MARGIN) {
		adjustedCoord = clickCoord - menuSize;
	}

	// If it still overflows after flipping, clamp within the display area
	const maxCoord = areaEndCoord - VIEWPORT_MARGIN - menuSize;
	if (adjustedCoord > maxCoord) {
		adjustedCoord = maxCoord;
	}
	if (adjustedCoord < areaStartCoord + VIEWPORT_MARGIN) {
		adjustedCoord = areaStartCoord + VIEWPORT_MARGIN;
	}

	return adjustedCoord;
}

/**
 * Adjusts the context menu's display coordinates so it does not overflow the canvas area.
 *
 * Because the menu is positioned with position: fixed (browser viewport coordinates), boundaries
 * use the canvas root element's getBoundingClientRect() (same coordinate system), obtained via
 * CanvasViewportElementRefContext.
 * state.viewport is the canvas's internal scroll/zoom state and cannot be used here.
 *
 * Since the menu's height depends on the number of items, it is measured from the real DOM after
 * rendering using useLayoutEffect before adjusting (applied before paint, so no flicker occurs).
 *
 * @param position - the click coordinate at right-click time
 * @param menuRef - ref of the menu element (used to measure its actual size)
 * @returns the adjusted display coordinates
 */
export function useContextMenuPosition(
	position: ContextMenuPosition,
	menuRef: RefObject<HTMLDivElement | null>,
): AdjustedMenuPosition {
	const viewportElementRef = useCanvasViewportElementRef();
	const [adjustedPosition, setAdjustedPosition] =
		useState<AdjustedMenuPosition>({
			left: position.clientX,
			top: position.clientY,
		});

	useLayoutEffect(() => {
		const menuElement = menuRef.current;
		if (!menuElement) {
			setAdjustedPosition({ left: position.clientX, top: position.clientY });
			return;
		}

		const { width: menuWidth, height: menuHeight } =
			menuElement.getBoundingClientRect();

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

		setAdjustedPosition({
			left: calcAdjustedAxisCoord(
				position.clientX,
				menuWidth,
				areaRect.left,
				areaRect.right,
			),
			top: calcAdjustedAxisCoord(
				position.clientY,
				menuHeight,
				areaRect.top,
				areaRect.bottom,
			),
		});
	}, [position, menuRef, viewportElementRef]);

	return adjustedPosition;
}

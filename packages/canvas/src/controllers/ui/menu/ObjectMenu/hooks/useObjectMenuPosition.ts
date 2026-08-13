import { type RefObject, useLayoutEffect, useMemo, useState } from "react";

import { useLingeringFlag } from "./useLingeringFlag";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { useCanvasRegistries } from "../../../../registries/CanvasRegistriesContext";
import { calcObjectsBoundingBox } from "../../../../utils/calcObjectBoundingBox";

/** Distance between the ObjectMenu and the object (px) */
const DISTANCE_FROM_OBJECT = 40;

/**
 * How long the menu stays away after the view stops moving (ms).
 *
 * A pan and the glide it leaves behind are separate states, and so are a glide
 * and the next pan: each pair has a gap of a frame or more where neither is set,
 * which without this would flash the menu back for that gap. Long enough to
 * bridge a press that is about to become a drag, short enough to read as the
 * menu simply settling.
 */
const REAPPEAR_DELAY_MS = 200;

type ObjectMenuPosition = {
	/** Whether the menu should be rendered */
	shouldRender: boolean;
	/** x coordinate in the canvas coordinate system */
	x: number;
	/** y coordinate in the canvas coordinate system */
	y: number;
};

/**
 * Computes the coordinates for positioning the menu below the selected object(s).
 *
 * Since the menu lives inside ScrollSyncedOverlay, coordinates are returned in the
 * canvas coordinate system. The overlay itself follows scrolling, so no viewport offset is needed.
 *
 * - Automatically positions menu above object if it would overflow bottom viewport boundary
 * - Adjusts horizontal position to fit within left/right viewport boundaries
 * - Measures actual menu dimensions from DOM for accurate positioning
 */
export function useObjectMenuPosition(
	state: CanvasControllerState,
	menuRef: RefObject<HTMLDivElement | null>,
): ObjectMenuPosition {
	const {
		selectedIds,
		selectedConnectorId,
		selectedTextSlot,
		objects,
		viewport,
		contextMenuPosition,
		areaSelection,
		activeDragKind,
		inertialScrolling,
		objectMenuOpenId,
		textEditState,
	} = state;

	// The menu sits below the selection's drawn extent, so a shape whose label
	// hangs outside its geometry box must not have the menu land on the label.
	const { objectVisualBounds } = useCanvasRegistries();

	const [menuDimensions, setMenuDimensions] = useState({
		width: 0,
		height: 40,
	});

	// Measure menu dimensions from DOM when it renders or selection changes.
	// Slot selection changes the item set (see filterTextSlotMenuSections), so the
	// width must be re-measured then too or the centering uses the stale width;
	// opening and closing a text editor narrows it the same way.
	const selectedIdsString = selectedIds.slice().sort().join(",");
	const selectedTextSlotKey =
		selectedTextSlot === null
			? null
			: `${selectedTextSlot.objectId}:${selectedTextSlot.slotId}`;
	const textEditKey =
		textEditState === null
			? null
			: `${textEditState.kind}:${textEditState.objectId}`;

	// Every way the view moves under the selection, as one state: dragging (except
	// while an ObjectMenu dropdown is open, so its sliders stay usable) and the
	// glide a released pan leaves behind. The linger is what keeps the handover
	// between the two from flashing the menu (see REAPPEAR_DELAY_MS).
	const isViewMoving =
		(activeDragKind !== null && objectMenuOpenId === null) || inertialScrolling;
	const isViewUnsettled = useLingeringFlag(isViewMoving, REAPPEAR_DELAY_MS);

	const shouldRender = useMemo(() => {
		const hasSelection = selectedIds.length > 0 || selectedConnectorId !== null;
		if (!hasSelection) {
			return false;
		}
		if (contextMenuPosition !== null) {
			return false;
		}
		// A shape's text editor keeps the menu: its text items are how a stretch of
		// the text being edited is styled (TextSlotStyleProperty), and the menu is
		// the only place the color and the size of one live. The menu itself never
		// commits the edit — ObjectMenuHandler runs no commit, and the press does
		// not even move the focus off the textarea (ObjectMenu) — so the session
		// survives a menu interaction instead of being left dangling (U6).
		// A connector label is still hidden: it is one text with one styling, so
		// there is nothing the menu could do mid-edit that it cannot do after.
		if (textEditState !== null && textEditState.kind !== "shape") {
			return false;
		}
		// Away while the view moves under the selection — a drag of any kind, and
		// the glide that continues a released pan, which would otherwise fly the
		// menu across the screen.
		if (isViewUnsettled) {
			return false;
		}
		if (areaSelection !== null) {
			return false;
		}
		return true;
	}, [
		selectedIds,
		selectedConnectorId,
		contextMenuPosition,
		isViewUnsettled,
		areaSelection,
		textEditState,
	]);

	useLayoutEffect(() => {
		if (menuRef.current && shouldRender) {
			const rect = menuRef.current.getBoundingClientRect();
			setMenuDimensions({ width: rect.width, height: rect.height });
		}
	}, [
		menuRef,
		shouldRender,
		selectedIdsString,
		selectedConnectorId,
		selectedTextSlotKey,
		textEditKey,
	]);

	return useMemo(() => {
		if (!shouldRender) {
			return { shouldRender: false, x: 0, y: 0 };
		}

		// Compute the bounding box of all selected objects
		const targetIds =
			selectedConnectorId !== null
				? [selectedConnectorId, ...selectedIds]
				: selectedIds;
		const bounds = calcObjectsBoundingBox(
			targetIds,
			objects,
			objectVisualBounds,
		);

		if (!bounds) {
			return { shouldRender: false, x: 0, y: 0 };
		}

		const { left: minX, top: minY, right: maxX, bottom: maxY } = bounds;

		const {
			zoom,
			width: viewportWidth,
			height: viewportHeight,
			minX: vpMinX,
			minY: vpMinY,
		} = viewport;

		// Compute the center X and bottom Y of the whole selection
		// Multiply canvas coordinates by zoom to match the ScrollSyncedOverlay coordinate system
		// (see the ScrollSyncedOverlay comment in CanvasStyled.ts for details)
		const objectCenterX = ((minX + maxX) / 2) * zoom;
		const objectBottomY = maxY * zoom;
		const objectTopY = minY * zoom;

		const menuWidth = menuDimensions.width;
		const menuHeight = menuDimensions.height;

		// Default position: below the object, centered
		let menuCenterX = objectCenterX;
		let menuY = objectBottomY + DISTANCE_FROM_OBJECT;

		// Calculate viewport boundaries in the same coordinate system (ScrollSyncedOverlay internal coordinates)
		const viewportMinX = vpMinX * zoom;
		const viewportMinY = vpMinY * zoom;
		const viewportMaxX = viewportMinX + viewportWidth;
		const viewportMaxY = viewportMinY + viewportHeight;

		// Check if menu overflows viewport vertically (bottom)
		const menuEffectiveBottom = menuY + menuHeight;
		if (menuEffectiveBottom > viewportMaxY) {
			// Position above the object
			menuY = objectTopY - DISTANCE_FROM_OBJECT - menuHeight;
		}

		// Ensure menu doesn't go above viewport
		if (menuY < viewportMinY) {
			menuY = viewportMinY;
		}

		// Horizontal boundary checks
		const menuHalfWidth = menuWidth / 2;
		if (menuCenterX + menuHalfWidth > viewportMaxX) {
			// Adjust to fit within right boundary
			menuCenterX = viewportMaxX - menuHalfWidth;
		}
		if (menuCenterX - menuHalfWidth < viewportMinX) {
			// Adjust to fit within left boundary
			menuCenterX = viewportMinX + menuHalfWidth;
		}

		// Compute the left-edge coordinate directly in px to avoid translateX(-50%),
		// preventing icon blur from sub-pixel rendering
		const menuX = menuCenterX - menuHalfWidth;

		return {
			shouldRender: true,
			x: Math.round(menuX),
			y: Math.round(menuY),
		};
	}, [
		shouldRender,
		selectedIds,
		selectedConnectorId,
		objects,
		viewport,
		menuDimensions,
		objectVisualBounds,
	]);
}

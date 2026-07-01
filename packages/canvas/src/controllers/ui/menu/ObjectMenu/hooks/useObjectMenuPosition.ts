import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
} from "@workspace/geometry";
import { type RefObject, useLayoutEffect, useMemo, useState } from "react";

import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { isGroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { calcConnectorBoundingBox } from "../../../../utils/calcConnectorBoundingBox";
import { calcGroupBoundingBox } from "../../../../utils/calcGroupBoundingBox";

/** Distance between the ObjectMenu and the object (px) */
const DISTANCE_FROM_OBJECT = 40;

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
		objects,
		viewport,
		contextMenuPosition,
		areaSelection,
		eventStartSnapshot,
		objectMenuOpenId,
	} = state;

	const [menuDimensions, setMenuDimensions] = useState({
		width: 0,
		height: 40,
	});

	// Measure menu dimensions from DOM when it renders or selection changes
	const selectedIdsString = selectedIds.slice().sort().join(",");
	const shouldRender = useMemo(() => {
		const hasSelection = selectedIds.length > 0 || selectedConnectorId !== null;
		if (!hasSelection) {
			return false;
		}
		if (contextMenuPosition !== null) {
			return false;
		}
		// Even when eventStartSnapshot is non-null, keep showing the menu if objectMenuOpenId is non-null
		// (so the menu stays visible while dragging a slider)
		if (eventStartSnapshot !== null && objectMenuOpenId === null) {
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
		eventStartSnapshot,
		areaSelection,
		objectMenuOpenId,
	]);

	useLayoutEffect(() => {
		if (menuRef.current && shouldRender) {
			const rect = menuRef.current.getBoundingClientRect();
			setMenuDimensions({ width: rect.width, height: rect.height });
		}
	}, [menuRef, shouldRender, selectedIdsString, selectedConnectorId]);

	return useMemo(() => {
		if (!shouldRender) {
			return { shouldRender: false, x: 0, y: 0 };
		}

		// Compute the bounding box of all selected objects
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		let hasValidObject = false;

		if (selectedConnectorId !== null) {
			const connector = objects[selectedConnectorId];
			if (connector) {
				const bbox = calcConnectorBoundingBox(
					connector as ConnectorState,
					objects,
				);
				if (bbox) {
					minX = Math.min(minX, bbox.left);
					minY = Math.min(minY, bbox.top);
					maxX = Math.max(maxX, bbox.right);
					maxY = Math.max(maxY, bbox.bottom);
					hasValidObject = true;
				}
			}
		}

		for (const id of selectedIds) {
			const obj = objects[id];
			if (!obj) {
				continue;
			}

			let bbox;
			if (isTransformedFrame(obj)) {
				// Objects with a Frame, such as rect and ellipse
				bbox = calcBoundingBox(obj);
			} else if (isGroupState(obj)) {
				// For a group, compute the bounding box recursively from its children
				bbox = calcGroupBoundingBox(obj, objects);
				if (!bbox) {
					continue;
				}
			} else if (isPoly(obj)) {
				// Objects with a points array, such as polyline and polygon
				const polyBbox = calcPolyBoundingBox(obj.points);
				if (!polyBbox) {
					continue;
				}
				bbox = polyBbox;
			} else {
				continue;
			}

			minX = Math.min(minX, bbox.left);
			minY = Math.min(minY, bbox.top);
			maxX = Math.max(maxX, bbox.right);
			maxY = Math.max(maxY, bbox.bottom);
			hasValidObject = true;
		}

		if (!hasValidObject) {
			return { shouldRender: false, x: 0, y: 0 };
		}

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
	]);
}

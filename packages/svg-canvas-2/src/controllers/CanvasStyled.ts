import styled from "@emotion/styled";

/**
 * Root viewport container that takes up full available space.
 */
export const Viewport = styled.div`
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
`;

/**
 * Styled wrapper element for the SVG canvas.
 */
export const Container = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	overflow: hidden;
	background-color: #ffffff;
`;

/**
 * Props for scroll-synced overlay containers.
 */
type ScrollSyncedOverlayProps = {
	left: number;
	top: number;
	zoom: number;
};

/**
 * Container for HTML elements with fixed size that follow canvas content position.
 * Elements inside maintain their original size regardless of zoom level,
 * but their position tracks the zoomed canvas coordinates.
 *
 * Use case: Object menus, info popovers that appear near canvas objects.
 *
 * Coordinate System:
 * - SVG viewBox: `${minX} ${minY} ${width/zoom} ${height/zoom}`
 * - Canvas object at (cx, cy) appears at screen position: (cx - minX) * zoom
 * - To align HTML elements with canvas objects:
 *   1. Container offset: left = -minX * zoom, top = -minY * zoom
 *   2. Child element position: left = cx * zoom, top = cy * zoom
 *   3. Final screen position: -minX * zoom + cx * zoom = (cx - minX) * zoom ✓
 *
 * Note: Child elements must multiply their canvas coordinates by zoom for positioning.
 */
export const ScrollSyncedOverlay = styled.div<ScrollSyncedOverlayProps>`
	position: absolute;
	left: ${(props) => props.left * props.zoom}px;
	top: ${(props) => props.top * props.zoom}px;
	pointer-events: none;
`;

/**
 * Props for zoom-scaled overlay containers.
 */
type ZoomScaledOverlayProps = {
	left: number;
	top: number;
	zoom: number;
};

/**
 * Container for HTML elements that follow canvas scroll AND zoom.
 * Used for elements that should scale with the canvas zoom level.
 * Example: Text editors that appear directly on objects.
 */
export const ZoomScaledOverlay = styled.div<ZoomScaledOverlayProps>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	transform: scale(${(props) => props.zoom});
	transform-origin: top left;
	pointer-events: none;
`;

/**
 * Container for HTML elements fixed to the viewport.
 * Used for UI elements that stay in fixed positions regardless of canvas scroll/zoom.
 * Example: Menu bars, zoom controls, mini-maps.
 */
export const ViewportOverlay = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	overflow: hidden;
	pointer-events: none;
	user-select: none;
`;

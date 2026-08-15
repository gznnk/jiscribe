import styled from "@emotion/styled";

import type { CanvasGestureHandling } from "./CanvasGestureHandling";
import { theme } from "../constants/theme";

type CanvasRootProps = {
	gestureHandling: CanvasGestureHandling;
};

type ViewportProps = {
	cursor?: string;
};

/**
 * Outermost container that takes up full available space and stacks the
 * toolbar above the canvas viewport (flex column).
 *
 * The gesture recognizer's pointerHandlers / pointer capture are attached to this element.
 * By containing both the toolbar (data-kind="menu") and the canvas region,
 * toolbar interactions also flow through the same gesture path.
 *
 * Also the keyboard scope: Canvas.tsx renders this with tabIndex so it can hold
 * focus, and keydown listeners (shortcuts / paste) are attached here instead of
 * `document` — only the focused Canvas handles shortcuts when multiple Canvases
 * share a page. The focus ring is suppressed since focus is a routing concern
 * here, not a visual one.
 */
export const CanvasRoot = styled.div<CanvasRootProps>`
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	overflow: hidden;
	outline: none;

	/* Touch foundation: without touch-action none, the browser claims touch moves
	   for page pan/zoom and aborts in-progress drags with pointercancel. Scrollable
	   descendants (textarea, help modal body) still pan natively — touch-action is
	   consulted only up to the scrolling element itself. user-select / touch-callout
	   suppress long-press text selection and the OS callout; both inherit, so
	   editable fields opt back in below.

	   Cooperative gesture handling splits touch by what the finger lands on: the
	   background belongs to the host page (both pan axes, so a scrolling document
	   moves past the canvas), while objects, controls and menus claim their own
	   touches below — a drag that starts on a shape must run to the end, never be
	   cancelled into a page scroll halfway. Moving the view itself takes two
	   fingers (the pinch), matching the embedded-map convention; the one-finger
	   background pan is suppressed on the handler side (CanvasEventHandler).
	   Neither value includes pinch-zoom, so pinch keeps zooming the canvas. */
	touch-action: ${(props) =>
		props.gestureHandling === "cooperative" ? "pan-x pan-y" : "none"};
	user-select: none;
	-webkit-user-select: none;
	-webkit-touch-callout: none;

	/* The per-element claim. Effective as-is for the HTML pieces (menus); for the
	   SVG shape elements Chromium and WebKit ignore touch-action, so the working
	   claim for those is the touchstart guard in useCooperativeTouchClaim. */
	${(props) =>
		props.gestureHandling === "cooperative"
			? `[data-kind="object"],
	[data-kind="connector"],
	[data-kind="control"],
	[data-kind="menu"] {
		touch-action: none;
	}`
			: ""}

	/* Same as the Svg style (see CanvasViewStyled): hosts may set
	   font-synthesis: none, which would leave the text editor overlays —
	   rendered outside the SVG — without synthetic italic/bold. */
	font-synthesis: weight style;

	input,
	textarea {
		user-select: text;
		-webkit-user-select: text;
	}
`;

/**
 * Canvas drawing region that sits below the toolbar (flex child filling the
 * remaining space).
 *
 * Edge-scroll detection is based on this element's rectangle (measured via
 * useContainerResize) and the screen position of the contained SVG (getScreenCTM).
 * Constraining it below the toolbar makes the top edge band align with the
 * "visible top of the canvas".
 */
export const Viewport = styled.div<ViewportProps>`
	position: relative;
	flex: 1 1 auto;
	min-height: 0;
	overflow: hidden;
	${(props) => props.cursor && `cursor: ${props.cursor};`}
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
	background-color: ${theme.canvasBg};
`;

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
 *
 * left / top change every frame during pan/zoom, so they are passed via the
 * `style` prop instead of emotion interpolation (which would insert a new CSS
 * rule per value — see #131).
 */
export const ScrollSyncedOverlay = styled.div`
	position: absolute;
	pointer-events: none;
`;

/**
 * Container for HTML elements that follow canvas scroll AND zoom.
 * Used for elements that should scale with the canvas zoom level.
 * Example: Text editors that appear directly on objects.
 *
 * left / top / scale change every frame during pan/zoom, so they are passed
 * via the `style` prop instead of emotion interpolation (see #131).
 */
export const ZoomScaledOverlay = styled.div`
	position: absolute;
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

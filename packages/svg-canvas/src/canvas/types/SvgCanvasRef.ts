import type { RefObject } from "react";

/**
 * Type definition for SVG canvas references that can be used across hooks.
 * This allows direct access to DOM elements without using Context API.
 */
export interface SvgCanvasRef {
	/** Reference to the container div element */
	containerRef: RefObject<HTMLDivElement | null>;
	/** Reference to the SVG element */
	svgRef: RefObject<SVGSVGElement | null>;
}

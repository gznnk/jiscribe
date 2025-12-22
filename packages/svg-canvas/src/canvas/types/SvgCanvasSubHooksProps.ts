import type { EventBus } from "@workspace/event-bus";

import type { SvgCanvasData } from "./SvgCanvasData";
import type { SvgCanvasPanZoom } from "./SvgCanvasPanZoom";
import type { SvgCanvasRef } from "./SvgCanvasRef";
import type { SvgCanvasState } from "./SvgCanvasState";

/**
 * Type for canvas custom hooks.
 */
export type SvgCanvasSubHooksProps = {
	canvasState: SvgCanvasState;
	eventBus: EventBus;
	canvasRef?: SvgCanvasRef | null;
	setCanvasState: React.Dispatch<React.SetStateAction<SvgCanvasState>>;
	onDataChange?: (data: SvgCanvasData) => void;
	onPanZoomChange?: (pz: SvgCanvasPanZoom) => void;
};

import type { Prettify } from "@workspace/utility-types";

import type { SvgCanvasPanZoom } from "./SvgCanvasPanZoom";
import type { DiagramData } from "../../types/data/core/DiagramData";

/**
 * Type for the data of the SvgCanvas.
 */
export type SvgCanvasData = Prettify<
	SvgCanvasPanZoom & {
		id: string;
		items: DiagramData[];
	}
>;

import { HtmlPreviewDefaultData } from "../../../constants/data/shapes/HtmlPreviewDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { HtmlPreviewData } from "../../../types/data/shapes/HtmlPreviewData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { HtmlPreviewState } from "../../../types/state/shapes/HtmlPreviewState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

/**
 * Maps HtmlPreview state to data
 */
export const mapHtmlPreviewStateToData =
	createStateToDataMapper<HtmlPreviewData>(HtmlPreviewDefaultData);

export const htmlPreviewStateToData = (state: Diagram): DiagramData =>
	mapHtmlPreviewStateToData(state as HtmlPreviewState);

import { HtmlPreviewDefaultState } from "../../../constants/state/shapes/HtmlPreviewDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { HtmlPreviewState } from "../../../types/state/shapes/HtmlPreviewState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

/**
 * Maps HtmlPreview data to state
 */
export const mapHtmlPreviewDataToState =
	createDataToStateMapper<HtmlPreviewState>(HtmlPreviewDefaultState);

export const htmlPreviewDataToState = (data: DiagramData): Diagram =>
	mapHtmlPreviewDataToState(data);

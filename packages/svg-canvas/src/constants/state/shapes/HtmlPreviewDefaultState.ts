import { CreateDefaultState } from "./CreateDefaultState";
import { HtmlPreviewFeatures } from "../../../types/data/shapes/HtmlPreviewData";
import type { HtmlPreviewState } from "../../../types/state/shapes/HtmlPreviewState";
import { HtmlPreviewDefaultData } from "../../data/shapes/HtmlPreviewDefaultData";

/**
 * Default HtmlPreview state template.
 */
export const HtmlPreviewDefaultState = CreateDefaultState<HtmlPreviewState>({
	type: "HtmlPreview",
	options: HtmlPreviewFeatures,
	baseData: HtmlPreviewDefaultData,
	properties: {},
});

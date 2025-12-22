import { HtmlPreviewDefaultState } from "../../../constants/state/shapes/HtmlPreviewDefaultState";
import type { HtmlPreviewState } from "../../../types/state/shapes/HtmlPreviewState";
import { newId } from "../common/newId";

/**
 * Create HtmlPreview state
 */
export const createHtmlPreviewState = ({
	x,
	y,
}: {
	x: number;
	y: number;
}): HtmlPreviewState => ({
	...HtmlPreviewDefaultState,
	id: newId(),
	x,
	y,
});

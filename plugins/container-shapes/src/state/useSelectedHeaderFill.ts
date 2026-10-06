import { isString } from "@jiscribe/basic-validators";
import { selectionValueAs, useSelectionStyle } from "@jiscribe/canvas-sdk";

import { CONTAINER_DOC_DEFAULTS } from "../schema/ContainerDoc";

/**
 * The header color the selection is drawn with, for the two controls that state
 * it (the ObjectMenu's HeaderColorMenu and the sidebar's HeaderColorProperty).
 *
 * `headerFill` is a property the container declares for itself, so its value
 * arrives untyped and is narrowed here.
 *
 * @returns The color every selected container carries, or the doc default
 *   (`"auto"`, the theme surface) when they disagree or none carries one
 */
export const useSelectedHeaderFill = (): string =>
	selectionValueAs(
		useSelectionStyle("headerFill"),
		isString,
		CONTAINER_DOC_DEFAULTS.headerFill,
	);

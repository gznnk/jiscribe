import { isString } from "@jiscribe/basic-validators";
import type { ObjectState } from "@jiscribe/canvas";
import { getFirstSelectedPropValue } from "@jiscribe/canvas-sdk";

import { CONTAINER_DOC_DEFAULTS } from "../schema/ContainerDoc";

/**
 * The header color the selection is drawn with, for the two controls that state
 * it (the ObjectMenu's HeaderColorMenu and the sidebar's HeaderColorProperty).
 *
 * @param selectedIds - The selection, in the order the first container is taken from; a selected group is searched down into its descendants
 * @param objects - Every object of the canvas, keyed by id
 * @returns The first selected container's `headerFill`, or the doc default (`"auto"`, the theme surface) when none carries one
 */
export const getSelectedHeaderFill = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): string =>
	getFirstSelectedPropValue(selectedIds, objects, "headerFill", isString) ??
	CONTAINER_DOC_DEFAULTS.headerFill;

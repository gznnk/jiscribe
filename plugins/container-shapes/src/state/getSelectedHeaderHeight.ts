import { isNumber } from "@jiscribe/basic-validators";
import type { ObjectState } from "@jiscribe/canvas";
import { getFirstSelectedPropValue } from "@jiscribe/canvas-sdk";

import { CONTAINER_HEADER_HEIGHT } from "../schema/ContainerDoc";

/**
 * The header band height the selection is drawn with, for the sidebar row that
 * states it (HeaderHeightProperty). Read the way getSelectedHeaderFill reads the
 * color: the first selected container's value stands for the selection.
 *
 * @param selectedIds - The selection, in the order the first container is taken from; a selected group is searched down into its descendants
 * @param objects - Every object of the canvas, keyed by id
 * @returns The first selected container's `headerHeight` in local px, or CONTAINER_HEADER_HEIGHT when none states one
 */
export const getSelectedHeaderHeight = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): number =>
	getFirstSelectedPropValue(selectedIds, objects, "headerHeight", isNumber) ??
	CONTAINER_HEADER_HEIGHT;

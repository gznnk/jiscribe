import { isNumber } from "@jiscribe/basic-validators";
import { selectionValueAs, useSelectionStyle } from "@jiscribe/canvas-sdk";

import { CONTAINER_HEADER_HEIGHT } from "../schema/ContainerDoc";

/**
 * The header band height the selection is drawn with, for the sidebar row that
 * states it (HeaderHeightProperty). Read the way useSelectedHeaderFill reads the
 * color: one value for the whole selection, narrowed from the untyped value a
 * self-declared property comes back as.
 *
 * @returns The height in local px every selected container carries, or
 *   CONTAINER_HEADER_HEIGHT when they disagree or none states one
 */
export const useSelectedHeaderHeight = (): number =>
	selectionValueAs(
		useSelectionStyle("headerHeight"),
		isNumber,
		CONTAINER_HEADER_HEIGHT,
	);

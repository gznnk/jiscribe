import { selectionValueOr, useSelectionStyle } from "@jiscribe/canvas-sdk";

import { CONTAINER_HEADER_HEIGHT } from "../schema/ContainerDoc";
import { CONTAINER_STYLE } from "../style/containerStyle";

/**
 * The header band height the selection is drawn with, for the sidebar row that
 * states it (HeaderHeightProperty). Read the way useSelectedHeaderFill reads the
 * color: one value for the whole selection, typed by the declaration it is read
 * through.
 *
 * @returns The height in local px every selected container carries, or
 *   CONTAINER_HEADER_HEIGHT when they disagree, none states one, or the one they
 *   agree on is unset
 */
export const useSelectedHeaderHeight = (): number =>
	selectionValueOr(
		useSelectionStyle(CONTAINER_STYLE, "headerHeight"),
		CONTAINER_HEADER_HEIGHT,
	);

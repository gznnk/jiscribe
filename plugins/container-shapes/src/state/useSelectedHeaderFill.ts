import { selectionValueOr, useSelectionStyle } from "@jiscribe/canvas-sdk";

import { CONTAINER_DOC_DEFAULTS } from "../schema/ContainerDoc";
import { CONTAINER_STYLE } from "../style/containerStyle";

/**
 * The header color the selection is drawn with, for the two controls that state
 * it (the ObjectMenu's HeaderColorMenu and the sidebar's HeaderColorProperty).
 *
 * `headerFill` is a kind the container declares for itself, so the read goes
 * through that declaration (CONTAINER_STYLE), which is what types it.
 *
 * @returns The color every selected container carries, or the doc default
 *   (`"auto"`, the theme surface) when they disagree, none carries one, or the
 *   one they agree on is unset
 */
export const useSelectedHeaderFill = (): string =>
	selectionValueOr(
		useSelectionStyle(CONTAINER_STYLE, "headerFill"),
		undefined,
	) ?? CONTAINER_DOC_DEFAULTS.headerFill;

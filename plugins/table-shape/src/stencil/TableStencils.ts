import type { Stencil } from "@jiscribe/canvas";
import { createTypeStencils } from "@jiscribe/canvas-sdk";

import { TableIcon } from "./TableIcon";

/**
 * The palette's single table preset. It overrides nothing: the 2x2 grid of empty
 * cells a fresh table starts as is already what TABLE_DOC_DEFAULTS states.
 */
export const TableStencils: Stencil[] = createTypeStencils({
	objectType: "table",
	label: { en: "Table", ja: "テーブル" },
	icon: TableIcon,
});

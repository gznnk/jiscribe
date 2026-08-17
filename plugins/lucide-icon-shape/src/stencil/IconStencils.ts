import type { Stencil } from "@jiscribe/canvas";
import { createTypeStencils } from "@jiscribe/canvas-sdk";

import { IconStencilIcon } from "./IconStencilIcon";

export const IconStencils: Stencil[] = createTypeStencils({
	objectType: "lucideIcon",
	label: { en: "Icon", ja: "アイコン" },
	icon: IconStencilIcon,
});

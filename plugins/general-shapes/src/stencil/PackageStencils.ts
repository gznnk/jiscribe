import type { Stencil } from "@workspace/canvas";

import { PackageIcon } from "./PackageIcon";

export const PackageStencils: Stencil[] = [
	{
		id: "package",
		objectType: "package",
		label: { en: "Package", ja: "パッケージ" },
		icon: PackageIcon,
	},
];

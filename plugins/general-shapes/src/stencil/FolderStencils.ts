import type { Stencil } from "@workspace/canvas";

import { FolderIcon } from "./FolderIcon";

export const FolderStencils: Stencil[] = [
	{
		id: "folder",
		objectType: "folder",
		label: { en: "Folder", ja: "フォルダ" },
		icon: FolderIcon,
	},
];

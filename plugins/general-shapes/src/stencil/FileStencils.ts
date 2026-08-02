import type { Stencil } from "@workspace/canvas";

import { FileIcon } from "./FileIcon";

export const FileStencils: Stencil[] = [
	{
		id: "file",
		objectType: "file",
		label: { en: "File", ja: "ファイル" },
		icon: FileIcon,
	},
];

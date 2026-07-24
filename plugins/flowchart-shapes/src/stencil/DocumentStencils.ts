import type { Stencil } from "@workspace/canvas";

import { DocumentIcon } from "./DocumentIcon";

export const DocumentStencils: Stencil[] = [
	{
		id: "document",
		objectType: "document",
		label: { en: "Document", ja: "書類" },
		icon: DocumentIcon,
	},
];

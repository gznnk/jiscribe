import type { Stencil } from "@workspace/canvas";

import { NoteIcon } from "./NoteIcon";

export const NoteStencils: Stencil[] = [
	{
		id: "note",
		objectType: "note",
		label: { en: "Note", ja: "ノート" },
		icon: NoteIcon,
	},
];

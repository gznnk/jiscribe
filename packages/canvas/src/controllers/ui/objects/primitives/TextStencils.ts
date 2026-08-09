import { TextIcon } from "./TextIcon";
import type { Stencil } from "../Stencil";

export const TextStencils: Stencil[] = [
	{
		id: "text",
		objectType: "text",
		label: { en: "Text", ja: "テキスト" },
		icon: TextIcon,
		// An empty text object measures to a box barely wider than the caret, so a
		// freshly placed one would read as nothing having happened. It starts with
		// a word to overwrite instead.
		defaultOverrides: { text: "Text" },
	},
];

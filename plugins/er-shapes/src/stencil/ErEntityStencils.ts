import type { Stencil } from "@jiscribe/canvas";
import { createTypeStencils } from "@jiscribe/canvas-sdk";

import { ErEntityIcon } from "./ErEntityIcon";
import { ErEntityFeatures } from "../schema/ErEntityDoc";
import type { ErEntityColumnDoc } from "../schema/ErEntityDoc";

/**
 * The palette's single entity preset: a named entity with a primary key and two
 * ordinary columns, so a fresh one already shows a keyed row, unkeyed rows and
 * every part of a row. The slot widths are ER_ENTITY_DOC_DEFAULTS'.
 */
export const ErEntityStencils: Stencil[] = createTypeStencils({
	objectType: ErEntityFeatures.type,
	label: { en: "Entity", ja: "エンティティ" },
	icon: ErEntityIcon,
	defaultOverrides: {
		name: "Entity",
		columns: [
			{ key: "PK", name: "id", type: "int" },
			{ name: "name", type: "varchar(100)" },
			{ name: "created_at", type: "timestamp" },
		] satisfies ErEntityColumnDoc[],
	},
});

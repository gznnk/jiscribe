import type { StyleTable } from "@jiscribe/canvas-sdk";
import { fieldEntry } from "@jiscribe/canvas-sdk";

import type { ContainerState } from "../state/ContainerState";

/**
 * What a container answers for beyond its features: the header band, which no
 * `ObjectFeatures` flag speaks for — its face is a second fill and its height a
 * number of its own.
 *
 * Handed to the type through `ObjectTypeDefinition.style` (definition.ts) and
 * read through by the rows that state these values (useSelectedHeaderFill /
 * useSelectedHeaderHeight), so one declaration types the write and the read
 * alike. Both fields are in the doc definition's `extraKeys`, which is what
 * registration checks an entry against.
 */
export const CONTAINER_STYLE = {
	headerFill: fieldEntry("headerFill", "string"),
	headerHeight: fieldEntry("headerHeight", "number"),
} satisfies StyleTable<ContainerState>;

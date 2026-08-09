import type { Stencil } from "@jiscribe/canvas";

/**
 * Builds the palette contribution of an object type that offers a single preset,
 * whose `id` is then the object type itself.
 *
 * A type offering several presets writes the array out instead — their ids have
 * to differ from each other, so they cannot all be the object type.
 *
 * @param preset The stencil minus its `id`; `objectType` becomes the id, which is what host label overrides and toolbar entries look up.
 * @returns A one-element array, ready as an `ObjectTypeDefinition.stencils`.
 */
export const createTypeStencils = (preset: Omit<Stencil, "id">): Stencil[] => [
	{ id: preset.objectType, ...preset },
];

// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definition.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import type { ContainerDoc } from "./schema/ContainerDoc";
import {
	CONTAINER_DOC_DEFAULTS,
	ContainerFeatures,
} from "./schema/ContainerDoc";
import { calcContainerTextRegion } from "./schema/textRegions";
import { validateContainerHeaderFields } from "./schema/validateContainerHeaderFields";

export const containerDocDefinition: ObjectDocDefinition = createFrameObjectDoc(
	{
		features: ContainerFeatures,
		defaults: CONTAINER_DOC_DEFAULTS,
		extraKeys: [
			"headerFill",
			"headerHeight",
		] satisfies readonly (keyof ContainerDoc)[],
		textRegion: calcContainerTextRegion,
		description:
			'Container ("frame") shape: a titled rectangle that marks off a region of the diagram, typically a module, subsystem or bounded context. Uses the same rect-based geometry (x/y/width/height) as RectDoc. `text` is the title and is drawn in the top header band, never in the body; the body is click-through, so objects lying over it stay directly selectable. Objects are put inside it by geometry alone: give them coordinates within the box and place them after the container in `root` so they paint on top. A container has no `children` and does not carry its contents when it moves — wrap them in a GroupDoc when they must move together. The palette entries Frame / Boundary / Zone are all this type: Boundary is a container with `strokeDashType: "dashed"`, Zone one with a tinted `fill`.',
		summary: "titled region (module, subsystem, boundary)",
		validateExtra: validateContainerHeaderFields,
	},
);

/**
 * Headless `CanvasDocPlugin` for the container shape: the doc-layer view of
 * `containerPlugin`, teaching `createCanvasParser` the type without loading any
 * React / presentation code (packages/canvas/docs/12-plugin-architecture.md).
 */
export const containerDocPlugin: CanvasDocPlugin = {
	id: "container-shapes",
	objects: { container: containerDocDefinition },
};

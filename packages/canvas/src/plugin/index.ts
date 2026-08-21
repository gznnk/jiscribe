// Vocabulary for plugin authors (#144 tier 1, stable entry).
// A plugin needs only a declaration annotated `ObjectTypeDefinition<TDoc, TState>`, put on
// `CanvasPlugin.objects` and handed to the host. Only built-in records use `defineObject`,
// which exists for per-entry TState inference.
export type { CanvasPlugin } from "./CanvasPlugin";
export { defineObject } from "./ObjectTypeDefinition";
export type {
	ObjectTypeDefinition,
	AnyObjectTypeDefinition,
} from "./ObjectTypeDefinition";
// Headless (doc-layer) counterparts; the canonical home is `src/doc.ts`.
export type { ObjectDocDefinition } from "@jiscribe/doc/plugin/ObjectDocDefinition";
export type { CanvasDocPlugin } from "@jiscribe/doc/plugin/CanvasDocPlugin";

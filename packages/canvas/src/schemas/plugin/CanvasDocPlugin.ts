import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import type { ObjectType } from "../objects/types/ObjectType";

/**
 * Headless (UI-independent) plugin bundle: the doc-layer contributions a plugin
 * makes, read by `createCanvasParser` to teach parse-time validation about the
 * plugin's object types. The full
 * {@link import("../../plugin/CanvasPlugin").CanvasPlugin} is structurally
 * assignable to this, since its `objects` values are the UI definitions that
 * extend {@link ObjectDocDefinition}.
 */
export type CanvasDocPlugin = {
	id: string;

	/** Object-type doc contributions, keyed by type. */
	objects?: Readonly<Partial<Record<ObjectType, ObjectDocDefinition>>>;
};

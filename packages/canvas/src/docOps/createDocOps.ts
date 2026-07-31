import { addObject, type AddObjectParams } from "./addObject";
import { connect, type ConnectParams } from "./connect";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { DocDefinitionsConfig } from "../schemas/plugin/resolveDocDefinitions";
import { resolveDocDefinitions } from "../schemas/plugin/resolveDocDefinitions";

/**
 * Doc-ops instance driven by doc definitions. Built-in and plugin types alike are handled
 * uniformly, following the factory / features passed to `createDocOps`.
 */
export type DocOps = {
	/**
	 * Add an object of `type`, mutating `doc` in place and returning the new id.
	 * Throws `DocOperationError` for a type this instance's definitions cannot create.
	 */
	addObject(doc: CanvasDoc, type: string, params: AddObjectParams): string;
	/**
	 * Join two objects with a connector, mutating `doc` in place and returning the new id.
	 * Throws `DocOperationError` when an endpoint is missing or not connectable.
	 */
	connect(doc: CanvasDoc, params: ConnectParams): string;
};

/**
 * Build a {@link DocOps}.
 *
 * @param config - Resolved by {@link resolveDocDefinitions}, whose preset/plugin merging and
 *   duplicate-type detection mirror createCanvasParser. Omit to handle only built-in definitions
 */
export const createDocOps = (config?: DocDefinitionsConfig): DocOps => {
	const definitions = resolveDocDefinitions(config, "createDocOps");
	return {
		addObject: (doc, type, params) => addObject(doc, type, params, definitions),
		connect: (doc, params) => connect(doc, params, definitions),
	};
};

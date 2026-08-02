import type { CanvasParseResult } from "./parseWithRegistry";
import { parseWithRegistry } from "./parseWithRegistry";
import { initializeObjectDocValidatorRegistry } from "../../registry/initializeObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

export type { CanvasParseResult } from "./parseWithRegistry";

/**
 * Validates a Canvas document string in stages — JSON syntax → unknown-content strip →
 * structure/semantics — and returns the result as a
 * {@link import("./parseWithRegistry").CanvasParseResult}.
 *
 * Since it returns a discriminated union instead of throwing, both the extension and the Webview
 * can share the same logic, and unexpected errors are also handled explicitly as `internal-error`
 * rather than being missed.
 *
 * This is the "default configuration" parser: it always validates against every built-in
 * object type via the global {@link objectDocValidatorRegistry}. Consumers that need to add
 * or replace object types (plugins) should use `createCanvasParser` instead; this function's
 * behavior is preserved unchanged so existing callers (editor-shell / MCP / VSCode extension /
 * examples) are unaffected.
 *
 * @param text the JSON string to parse
 */
export function parseCanvasText(text: string): CanvasParseResult {
	// parseWithRegistry delegates per-type validation and connectability checks to whatever
	// registry it is given. Since the global registry is used only for "validation at parse
	// time", populate it here if it is uninitialized (idempotent: does nothing if already
	// populated). This frees callers (the UI entry / the headless `./doc` entry) from having to
	// worry about initialization and structurally prevents false positives from picking the
	// wrong entry point.
	if (objectDocValidatorRegistry.isEmpty()) {
		initializeObjectDocValidatorRegistry();
	}

	return parseWithRegistry(text, objectDocValidatorRegistry);
}

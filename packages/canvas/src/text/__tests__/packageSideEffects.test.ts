import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The offer this package makes to the document layer is a side effect of
 * `src/index.ts` evaluating `./text/offerRendererTextMeasurement` — and a
 * bundler is free to drop a side-effect-only import from a package that declares
 * `"sideEffects": false`.
 *
 * Nothing in a test run would notice: vitest resolves the source and evaluates
 * every import, so the offer always lands here. Only a production bundle would
 * lose it, and then the first thing to measure text seals an estimate (or throws
 * with nothing offered at all) while every test stays green. Hence a guard on
 * the manifest rather than on the behaviour.
 *
 * If this package ever does need the field, the import has to stop being the
 * mechanism first: `"sideEffects": ["./src/text/offerRendererTextMeasurement.ts"]`
 * keeps that one module while letting the rest be dropped.
 */

const canvasPackageJson = JSON.parse(
	readFileSync(
		fileURLToPath(new URL("../../../package.json", import.meta.url)),
		"utf8",
	),
) as Record<string, unknown>;

describe("the canvas package manifest", () => {
	it("declares no sideEffects, so the text-measurement offer cannot be tree-shaken away", () => {
		expect("sideEffects" in canvasPackageJson).toBe(false);
	});
});

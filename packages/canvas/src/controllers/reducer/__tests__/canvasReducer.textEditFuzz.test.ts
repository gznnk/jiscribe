import { describe, it } from "vitest";

import { FUZZ_SCENARIOS, runTextEditFuzzSession } from "./support/textEditFuzz";

/**
 * Randomized exploration of the text-editing state loop (see
 * support/textEditFuzz.ts for the model and its invariants). A failure prints
 * the scenario, the seed and the full script; rerun the seed alone to debug.
 *
 * CI runs a fixed budget; raise TEXT_EDIT_FUZZ_RUNS locally to explore deeper:
 *   TEXT_EDIT_FUZZ_RUNS=5000 pnpm --filter @jiscribe/canvas exec vitest run \
 *     src/controllers/reducer/__tests__/canvasReducer.textEditFuzz.test.ts
 */
const RUNS_PER_SCENARIO = Number(process.env.TEXT_EDIT_FUZZ_RUNS ?? 100);
const OPS_PER_SESSION = 25;

describe("text edit session fuzz", () => {
	for (const scenario of FUZZ_SCENARIOS) {
		it(
			`holds every invariant through random sessions on a ${scenario.name}`,
			{ timeout: 600_000 },
			() => {
				for (let seed = 1; seed <= RUNS_PER_SCENARIO; seed += 1) {
					runTextEditFuzzSession(scenario, seed, OPS_PER_SESSION);
				}
			},
		);
	}
});

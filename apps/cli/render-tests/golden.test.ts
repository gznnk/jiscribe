import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { countDifferingPixels, readPng } from "./pngPixels";
import { runRenderCommand } from "../src/renderCommand";

/**
 * What `render` actually draws, guarded against a committed image.
 *
 * The unit tests around it cover the argument rules, the validation gate and the
 * shape of the output; none of them looks at the drawing, so a layout change
 * anywhere below — a derived height, a wrap, a label's box — passes them all. The
 * fixture is picked to sit on top of exactly those: a shape whose `height` the
 * document leaves out, a `text` in the block layout, CJK with the punctuation the
 * measurer treats specially, and a connector carrying a label.
 *
 * Kept out of `src/__tests__`, and out of `pnpm test` with it, because a run
 * costs a build (`pnpm build:cli`) and two browser launches:
 *
 *   pnpm --filter @jiscribe/cli test:render
 *
 * ## Updating the golden image
 *
 * When the drawing changes on purpose — the comfort padding a derived height
 * leaves, how a line wraps, how a label is boxed — the committed PNG is stale and
 * has to be replaced rather than argued with. Rebuild, redraw it in place, and
 * look at the result before committing it:
 *
 *   pnpm build:cli
 *   node engine/apps/cli/dist/index.mjs render \
 *     engine/apps/cli/render-tests/fixtures/golden.jis.json \
 *     -o engine/apps/cli/render-tests/fixtures/golden.png
 *
 * The image is written by whichever Chromium the machine has, so regenerate it
 * only when the drawing changed, never to make a red test go green: a diff that
 * is one Chromium disagreeing with another is what the tolerance below is for.
 */

const here = dirname(fileURLToPath(import.meta.url));

/** The document drawn, and the image it must still draw. */
const FIXTURE_DOC = join(here, "fixtures/golden.jis.json");
const GOLDEN_PNG = join(here, "fixtures/golden.png");

/**
 * Whether a render can be attempted at all: the harness has to have been built
 * (`pnpm build:cli`), which a checkout that has only run `pnpm install` has not
 * done. Launching a browser is checked inside the test itself, since a machine
 * with no Chromium should skip rather than fail.
 */
const isHarnessBuilt = existsSync(join(here, "../dist/harness/fonts.json"));

/**
 * Luminance distance, on the 0..255 scale, past which two pixels count as
 * disagreeing. Well above the last bit or two of an antialiased edge, well below
 * ink against paper.
 */
const LUMINANCE_THRESHOLD = 32;

/**
 * Share of the image allowed to disagree.
 *
 * Measured on the fixture rather than guessed
 * (scratch/2026-08-23-test-gaps/measure-tolerance.mjs). Re-rendering it moves
 * 0.000% of the pixels; the smallest regression it exists to catch — a derived
 * height off by 8px, one step of the comfort padding — moves 2.669%, five times
 * this. The headroom is for another Chromium build rasterizing glyphs
 * differently, which can only ever touch the antialiased edges, and those are
 * 4.05% of this image.
 *
 * The blind spot that buys: a change too small to shift the layout stays under
 * it. Dropping the connector label from 13px to 12px moves 0.095% and passes.
 * This is a net for the layout, not for the glyphs.
 */
const MAX_DIFFERING_RATIO = 0.005;

const workDir = mkdtempSync(join(tmpdir(), "jiscribe-golden-"));

afterAll(() => {
	rmSync(workDir, { recursive: true, force: true });
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** Draw the fixture, swallowing the command's own output, and report what it said. */
const render = async (
	output: string,
): Promise<{ code: number; stderr: string }> => {
	let stderr = "";
	vi.spyOn(process.stdout, "write").mockImplementation(() => true);
	vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
		stderr += String(chunk);
		return true;
	});
	const code = await runRenderCommand([FIXTURE_DOC, "-o", output]);
	return { code, stderr };
};

/** Whether the failure was "this machine has no browser", the one worth skipping over. */
const isMissingBrowser = ({
	code,
	stderr,
}: {
	code: number;
	stderr: string;
}): boolean => code === 1 && /needs a Chromium-based browser/.test(stderr);

describe.skipIf(!isHarnessBuilt)("the golden render", () => {
	it("draws the same bytes twice from the fixture the golden was made from", async (ctx) => {
		const first = join(workDir, "repeat-a.png");
		const second = join(workDir, "repeat-b.png");

		const one = await render(first);
		if (isMissingBrowser(one)) {
			ctx.skip();
			return;
		}
		expect(one.code).toBe(0);
		expect((await render(second)).code).toBe(0);

		// Byte equality, not the tolerance below: within one machine there is nothing
		// left to vary, so anything at all here is a bug rather than a difference.
		expect(readFileSync(first).equals(readFileSync(second))).toBe(true);
	}, 240_000);

	it("still draws the committed golden image", async (ctx) => {
		const output = join(workDir, "golden-actual.png");
		const result = await render(output);
		if (isMissingBrowser(result)) {
			ctx.skip();
			return;
		}
		expect(result.stderr).toBe("");
		expect(result.code).toBe(0);

		const expected = readPng(GOLDEN_PNG);
		const actual = readPng(output);

		// The pixel size follows the content bounds, which follow the wraps and the
		// derived heights: a mismatch is a layout change, and no rasterizer produces
		// one. Checked first so a size change is reported as itself.
		expect({ width: actual.width, height: actual.height }).toEqual({
			width: expected.width,
			height: expected.height,
		});

		const differing = countDifferingPixels(
			expected,
			actual,
			LUMINANCE_THRESHOLD,
		);
		const ratio = differing / (expected.width * expected.height);
		expect(
			ratio,
			`${differing} of ${expected.width * expected.height} pixels differ (${(ratio * 100).toFixed(3)}%); see this file's header before regenerating the golden`,
		).toBeLessThan(MAX_DIFFERING_RATIO);
	}, 240_000);
});

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { countDifferingPixels, readPng } from "./pngPixels.ts";

/**
 * Where `MAX_DIFFERING_RATIO` in golden.test.ts comes from.
 *
 * Draws the golden fixture, then deliberately-broken copies of it, and reports
 * what share of the pixels each one moves under the same metric the test uses.
 * The noise floor (a re-render of the untouched fixture) and the smallest
 * regression worth catching bracket the threshold; a run that no longer brackets
 * it is the sign to move it.
 *
 *   pnpm build:cli
 *   pnpm --filter @jiscribe/cli measure:tolerance
 *
 * Numbers, not a pass or a fail: nothing here asserts, and the figures quoted in
 * golden.test.ts are what one run of it printed.
 */

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "../dist/index.mjs");
const FIXTURE_DOC = join(here, "fixtures/golden.jis.json");

/** The luminance distance golden.test.ts counts a pixel as differing past. */
const LUMINANCE_THRESHOLD = 32;

/** A document loose enough to perturb by hand; only the fields touched below matter. */
type GoldenDoc = {
	root: {
		id: string;
		x?: number;
		y?: number;
		width?: number;
		height?: number;
		label?: { fontSize?: number };
	}[];
};

const objectOf = (doc: GoldenDoc, id: string) => {
	const found = doc.root.find((object) => object.id === id);
	if (found === undefined) {
		throw new Error(`the fixture no longer carries an object called ${id}`);
	}
	return found;
};

/**
 * Each perturbation is one regression the golden test exists to catch, sized to
 * be the smallest version of itself: what passes here passes unnoticed there.
 */
const VARIANTS: { name: string; perturb: (doc: GoldenDoc) => void }[] = [
	{
		name: "re-render (noise floor)",
		perturb: () => {},
	},
	{
		name: "auto shape height stated 8px taller than derived",
		perturb: (doc) => {
			objectOf(doc, "intake").height = 111;
		},
	},
	{
		name: "block text width 580 -> 578",
		perturb: (doc) => {
			objectOf(doc, "note").width = 578;
		},
	},
	{
		name: "connector label fontSize 13 -> 12",
		perturb: (doc) => {
			const { label } = objectOf(doc, "handoff");
			if (label === undefined) {
				throw new Error("the fixture's handoff connector carries no label");
			}
			label.fontSize = 12;
		},
	},
	{
		name: "whole drawing shifted 1px right",
		perturb: (doc) => {
			for (const object of doc.root) {
				if (typeof object.x === "number") {
					object.x += 1;
				}
			}
		},
	},
	{
		name: "whole drawing shifted 0.5px right (raster grid only)",
		perturb: (doc) => {
			for (const object of doc.root) {
				if (typeof object.x === "number") {
					object.x += 0.5;
				}
			}
		},
	},
	{
		name: "whole drawing shifted 0.5px down (raster grid only)",
		perturb: (doc) => {
			for (const object of doc.root) {
				if (typeof object.y === "number") {
					object.y += 0.5;
				}
			}
		},
	},
];

const workDir = mkdtempSync(join(tmpdir(), "jiscribe-tolerance-"));

/** Draws through the built CLI, the same entry point the render tests exercise. */
const render = (docPath: string, outPath: string) => {
	execFileSync(process.execPath, [CLI, "render", docPath, "-o", outPath], {
		stdio: "pipe",
	});
	return readPng(outPath);
};

try {
	const golden = render(FIXTURE_DOC, join(workDir, "golden.png"));
	const pixels = golden.width * golden.height;
	console.log(`golden: ${golden.width}x${golden.height}`);

	for (const { name, perturb } of VARIANTS) {
		const doc = JSON.parse(readFileSync(FIXTURE_DOC, "utf8")) as GoldenDoc;
		perturb(doc);
		const docPath = join(workDir, `${name.replace(/\W+/g, "-")}.jis.json`);
		writeFileSync(docPath, JSON.stringify(doc, null, "\t"));

		const image = render(docPath, docPath.replace(/\.jis\.json$/, ".png"));
		const report =
			image.width === golden.width && image.height === golden.height
				? `${((countDifferingPixels(golden, image, LUMINANCE_THRESHOLD) / pixels) * 100).toFixed(3)}%`
				: `size ${image.width}x${image.height}`;
		console.log(`${name.padEnd(52)} ${report}`);
	}
} finally {
	rmSync(workDir, { recursive: true, force: true });
}

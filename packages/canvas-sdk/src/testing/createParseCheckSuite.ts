import type {
	CanvasDocPlugin,
	CanvasParseResult,
	SemanticDiagnostic,
} from "@workspace/canvas/doc";
import { createCanvasParser } from "@workspace/canvas/doc";
import { describe, expect, it } from "vitest";

/** A doc as it is written in a test, before `JSON.stringify` hands it to the parser. */
export type ParseCheckDoc = {
	/** Doc format version, `1` today. */
	version: number;
	/** Top-level objects. Only these are scanned for the plugin's own types. */
	root: readonly Record<string, unknown>[];
};

/** A doc that must parse with no diagnostics, beyond the sample doc. */
export type ParseCheckAcceptCase = {
	/** `it` name, read as "…" after the shape name. */
	name: string;
	/** The doc to parse through the plugin-aware parser. */
	doc: ParseCheckDoc;
};

/** A doc the plugin's validators must reject, pinning where the diagnostic lands. */
export type ParseCheckRejectCase = {
	/** `it` name, read as "…" after the shape name. */
	name: string;
	/** The doc to parse through the plugin-aware parser. */
	doc: ParseCheckDoc;
	/** Paths at least one diagnostic must carry, in parser form (`root[0].text`). */
	diagnosticPaths: readonly string[];
};

/** Declaration of a plugin's parse-check suite ({@link createParseCheckSuite}). */
export type ParseCheckSuiteParams = {
	/** `describe` name, normally the shape family ("annotation shapes"). */
	name: string;
	/** The headless doc plugin under test — the parser is built from this alone. */
	plugin: CanvasDocPlugin;
	/**
	 * Doc exercising the plugin's shapes, ideally with a connector to one of them.
	 * Root objects whose `type` the plugin registers drive both the wired and the
	 * unwired check, so at least one is required.
	 */
	sampleDoc: ParseCheckDoc;
	/** Extra docs that must parse clean. Default: none. */
	accepts?: readonly ParseCheckAcceptCase[];
	/** Docs that must produce diagnostics. Default: none. */
	rejects?: readonly ParseCheckRejectCase[];
	/**
	 * Also parse a generated doc holding one box per registered type, chained with
	 * connectors, so a newly registered type cannot go unparsed. Requires every
	 * type to take a plain string body and at least two of them. Default `false`.
	 */
	checkEveryRegisteredType?: boolean;
};

const readDiagnostics = (
	result: CanvasParseResult,
): readonly SemanticDiagnostic[] =>
	"diagnostics" in result ? result.diagnostics : [];

/** One box per type, laid out in a row, plus a connector chain over them. */
const buildEveryTypeDoc = (types: readonly string[]): ParseCheckDoc => ({
	version: 1,
	root: [
		...types.map((type, index) => ({
			id: `shape-${index}`,
			type,
			x: index * 200,
			y: 0,
			width: 120,
			height: 100,
			text: type,
		})),
		...types.slice(1).map((_unused, index) => ({
			id: `link-${index}`,
			type: "connector",
			source: { owner: { id: `shape-${index}` }, anchor: { kind: "center" } },
			target: {
				owner: { id: `shape-${index + 1}` },
				anchor: { kind: "center" },
			},
			points: [],
		})),
	],
});

/**
 * Registers the parse-check suite every shape plugin needs: the sample doc parses
 * through a parser wired with the plugin, and — the counterpart that gives the
 * suite its point — a host that forgets to wire the plugin gets no error, it
 * silently loses those objects (unknown types parse to a warning and are dropped).
 *
 * @param params Suite declaration; see {@link ParseCheckSuiteParams}. `describe` /
 *   `it` are registered when this is called, so call it at the top level of a test
 *   file, not inside another `describe`.
 */
export function createParseCheckSuite(params: ParseCheckSuiteParams): void {
	const {
		name,
		plugin,
		sampleDoc,
		accepts = [],
		rejects = [],
		checkEveryRegisteredType = false,
	} = params;

	const parser = createCanvasParser({ plugins: [plugin] });
	const registeredTypes = Object.keys(plugin.objects ?? {});
	const pluginEntries = sampleDoc.root
		.map((object, index) => ({ id: object.id, type: object.type, index }))
		.filter(
			(entry) =>
				typeof entry.type === "string" && registeredTypes.includes(entry.type),
		);

	describe(name, () => {
		it("parses the sample doc and keeps its objects in the doc", () => {
			expect(pluginEntries.length).toBeGreaterThan(0);
			const result = parser.parse(JSON.stringify(sampleDoc));
			expect(readDiagnostics(result)).toEqual([]);
			expect(result.kind).toBe("ok");
			if (result.kind !== "ok") {
				return;
			}
			const ids = result.doc.root.map((object) => object.id);
			for (const entry of pluginEntries) {
				expect(ids).toContain(entry.id);
			}
		});

		it("drops the objects with a warning when the plugin is not wired", () => {
			expect(pluginEntries.length).toBeGreaterThan(0);
			const result = createCanvasParser().parse(JSON.stringify(sampleDoc));
			expect(result.kind).toBe("ok");
			if (result.kind !== "ok") {
				return;
			}
			const ids = result.doc.root.map((object) => object.id);
			const warningPaths = result.warnings.map((warning) => warning.path);
			for (const entry of pluginEntries) {
				expect(ids).not.toContain(entry.id);
				expect(warningPaths).toContain(`root[${entry.index}].type`);
			}
		});

		if (checkEveryRegisteredType) {
			it("parses one object of every registered type and connectors between them", () => {
				expect(registeredTypes.length).toBeGreaterThan(1);
				const result = parser.parse(
					JSON.stringify(buildEveryTypeDoc(registeredTypes)),
				);
				expect(readDiagnostics(result)).toEqual([]);
				expect(result.kind).toBe("ok");
			});
		}

		for (const acceptCase of accepts) {
			it(acceptCase.name, () => {
				const result = parser.parse(JSON.stringify(acceptCase.doc));
				expect(readDiagnostics(result)).toEqual([]);
				expect(result.kind).toBe("ok");
			});
		}

		for (const rejectCase of rejects) {
			it(rejectCase.name, () => {
				const result = parser.parse(JSON.stringify(rejectCase.doc));
				const paths = readDiagnostics(result).map(
					(diagnostic) => diagnostic.path,
				);
				for (const expectedPath of rejectCase.diagnosticPaths) {
					expect(paths).toContain(expectedPath);
				}
			});
		}
	});
}

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import type { CanvasDoc, SemanticDiagnostic } from "@jiscribe/canvas/doc";
import { createCanvasParser } from "@jiscribe/canvas/doc";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";
import {
	Ajv2020,
	type ErrorObject,
	type ValidateFunction,
} from "ajv/dist/2020";

import type { Diagnostic } from "./Diagnostic";

/** What {@link validateDoc} found, plus the parsed document when nothing failed. */
export type ValidateDocResult = {
	/** True when no diagnostic has `severity: "error"`. */
	ok: boolean;
	/** Every finding, schema errors first, then the parser's. */
	diagnostics: Diagnostic[];
	/**
	 * The document as the parser read it — unknown types and enum values already
	 * stripped, which is what the warnings report. Present whenever the parser
	 * accepted the text, schema errors or not, so a caller can go on diagnosing a
	 * document the canvas would still open.
	 */
	doc?: CanvasDoc;
};

const require = createRequire(import.meta.url);

let compiledSchemaValidator: ValidateFunction | null = null;

/**
 * The official schema's validator, compiled once. Read off disk rather than
 * imported, so the one file `pnpm generate:ai` writes stays the single source
 * (`@jiscribe/ai-docs` exports it as `./schema`).
 */
const getSchemaValidator = (): ValidateFunction => {
	if (!compiledSchemaValidator) {
		const schemaPath = require.resolve("@jiscribe/ai-docs/schema");
		const schema: object = JSON.parse(readFileSync(schemaPath, "utf8"));
		// The shipped schema leans on keywords ajv reports as unknown in strict mode
		// (it is written for editors, not for ajv), which strict mode turns into a
		// compile-time throw rather than a document error.
		compiledSchemaValidator = new Ajv2020({
			allErrors: true,
			strict: false,
		}).compile(schema);
	}
	return compiledSchemaValidator;
};

let sharedParser: ReturnType<typeof createCanvasParser> | null = null;

const getParser = (): ReturnType<typeof createCanvasParser> => {
	sharedParser ??= createCanvasParser({ plugins: standardDocPlugins });
	return sharedParser;
};

/** The `/root/3/width` path an ajv error carries, or undefined at the document root. */
const toSchemaPath = (error: ErrorObject): string | undefined =>
	error.instancePath === "" ? undefined : error.instancePath;

/**
 * Id of the object an instance path points into, taken from the document itself:
 * ajv reports positions (`/root/3/text`), and a position is of no use to a caller
 * naming objects by id.
 */
const findObjectIdAtPath = (
	data: unknown,
	instancePath: string,
): string | undefined => {
	let current: unknown = data;
	let objectId: string | undefined;
	for (const rawSegment of instancePath.split("/").slice(1)) {
		if (typeof current !== "object" || current === null) {
			return objectId;
		}
		const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
		current = (current as Record<string, unknown>)[segment];
		if (
			typeof current === "object" &&
			current !== null &&
			typeof (current as { id?: unknown }).id === "string"
		) {
			objectId = (current as { id: string }).id;
		}
	}
	return objectId;
};

const toSemanticDiagnostics = (
	diagnostics: readonly SemanticDiagnostic[],
	severity: Diagnostic["severity"],
): Diagnostic[] =>
	diagnostics.map((diagnostic) => ({
		severity,
		objectId: diagnostic.id,
		path: diagnostic.path === "" ? undefined : diagnostic.path,
		message: diagnostic.message,
	}));

/**
 * Checks one `.jis.json` text against both validators the format has: the
 * official JSON schema (`@jiscribe/ai-docs/schema`, what an editor completes and
 * validates against) and the canvas parser loaded with the shipped shape set
 * (what actually opens the file). The two overlap but neither contains the
 * other — the schema catches a misspelled property the parser strips silently,
 * the parser catches cross-object rules (duplicate ids, a connector pointing at
 * nothing) no schema can express — so a document is only sound when both pass.
 *
 * Both run even when the first fails, so one call reports everything wrong with
 * the file rather than one layer at a time.
 *
 * @param text - The whole file as text, not a parsed object: a JSON syntax error is one of the results, and it is reported as a single error diagnostic with no path
 * @returns `ok` false when any diagnostic is an error; `doc` is present whenever the parser accepted the text, holding the document with unknown types and enum values stripped (each strip reported as a warning)
 */
export const validateDoc = (text: string): ValidateDocResult => {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (error) {
		return {
			ok: false,
			diagnostics: [
				{
					severity: "error",
					message: `JSON syntax error: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
		};
	}

	const diagnostics: Diagnostic[] = [];

	const validateSchema = getSchemaValidator();
	if (!validateSchema(data)) {
		for (const error of validateSchema.errors ?? []) {
			diagnostics.push({
				severity: "error",
				objectId: findObjectIdAtPath(data, error.instancePath),
				path: toSchemaPath(error),
				message: `schema: ${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
			});
		}
	}

	const result = getParser().parse(text);
	switch (result.kind) {
		case "ok":
			diagnostics.push(...toSemanticDiagnostics(result.warnings, "warning"));
			return {
				ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
				diagnostics,
				doc: result.doc,
			};
		case "structure-error":
		case "semantic-error":
			diagnostics.push(...toSemanticDiagnostics(result.diagnostics, "error"));
			return { ok: false, diagnostics };
		case "syntax-error":
		case "internal-error":
			diagnostics.push({
				severity: "error",
				message: `parser: ${result.message}`,
			});
			return { ok: false, diagnostics };
	}
};

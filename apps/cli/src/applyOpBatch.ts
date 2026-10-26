import { access } from "node:fs/promises";

import {
	isAiDocOp,
	toDrivesMismatchText,
	toOutcomeText,
	toThrownText,
	type AiCanvasOpOutcome,
} from "@jiscribe/ai-tools";
import { applyCanvasOp, createCanvasOpHistory } from "@jiscribe/ai-tools/apply";
import { DocOperationError, type CanvasDoc } from "@jiscribe/doc";
import {
	standardCanvasToolSet,
	standardDocOps,
} from "@jiscribe/doc-tools/canvas-tools";
import {
	CanvasFileError,
	createEmptyCanvasDoc,
	isErrnoWithCode,
	loadCanvasFile,
	saveCanvasFile,
	type LoadedCanvasFile,
} from "@jiscribe/doc-tools/file";
import { z } from "zod";

import {
	BATCH_NAME_PATTERN,
	BATCH_NAME_SYNTAX,
	BatchReferenceError,
	resolveBatchReferences,
} from "./batchReferences";
import { findDocTool, toArgsSchema } from "./docToolCatalog";

/**
 * The name a refused write-back cites as the validation to run: the
 * introduced-findings check is validateDoc's, which is what `jiscribe validate`
 * reports (overflow, `diagnose`'s addition, is not checked).
 */
const VALIDATOR_NAME = "jiscribe validate";

/** One entry of a batch as given, before its references are resolved. */
const batchEntrySchema = z
	.object({
		tool: z.string(),
		args: z.record(z.string(), z.unknown()).optional(),
		as: z
			.string()
			.regex(BATCH_NAME_PATTERN, `must be an identifier (${BATCH_NAME_SYNTAX})`)
			.optional(),
	})
	.strict();

/** One checked batch entry: `{ tool, args?, as? }`, `as` an identifier. */
export type BatchEntry = z.output<typeof batchEntrySchema>;

/** What one entry that reached its tool came to. */
export type OpEntryResult = {
	/** The tool the entry ran. */
	tool: string;
	/** The entry's `as`, when it had one. */
	as?: string;
	/** Whether the tool succeeded. */
	ok: boolean;
	/** The reply jiscribe-mcp would give for the same call, `error:` prefix included on a failure. */
	text: string;
	/** The ids the tool created, in creation order; absent when it created none. */
	createdIds?: string[];
};

/** Why a run wrote nothing, and which entry it was down to when there is one. */
export type OpFailure = {
	/** The failing entry's position in the batch, from 0. Absent for a failure of the whole run (the file, the input, the write-back). */
	index?: number;
	/** The failing entry's tool, when it named one. */
	tool?: string;
	/** The failing entry's `as`, when it had one. */
	as?: string;
	/** What went wrong, fit to show as it is. */
	message: string;
};

/** What `jiscribe op` prints as JSON. */
export type OpReport = {
	/** True only when every entry succeeded and the write-back, if any, landed. */
	ok: boolean;
	/** Whether the file was written; never true when `ok` is false. */
	written: boolean;
	/** The file as resolved: absolute, through its links. */
	file: string;
	/** One per entry that reached its tool, in batch order; a run stops at the first failure. */
	results: OpEntryResult[];
	/** Present exactly when `ok` is false. */
	error?: OpFailure;
};

/** The errors whose message a reply shows as the user's (see toThrownText). */
const isUserFacingError = (error: unknown): error is Error =>
	error instanceof DocOperationError || error instanceof CanvasFileError;

/**
 * Checks a batch's shape: a JSON array of strict `{ tool, args?, as? }` entries
 * whose `as` names are distinct.
 *
 * @param value - The batch as parsed from JSON
 * @returns The entries, or the failure naming the first entry at fault (no index when the batch is not an array)
 */
export const parseBatchEntries = (
	value: unknown,
): { ok: true; entries: BatchEntry[] } | { ok: false; error: OpFailure } => {
	if (!Array.isArray(value)) {
		return {
			ok: false,
			error: {
				message:
					'the batch must be a JSON array of { "tool", "args"?, "as"? } entries',
			},
		};
	}
	const entries: BatchEntry[] = [];
	const indexByName = new Map<string, number>();
	for (const [index, rawEntry] of value.entries()) {
		const parsed = batchEntrySchema.safeParse(rawEntry);
		if (!parsed.success) {
			const rawTool: unknown =
				typeof rawEntry === "object" && rawEntry !== null
					? (rawEntry as Record<string, unknown>).tool
					: undefined;
			return {
				ok: false,
				error: {
					index,
					...(typeof rawTool === "string" ? { tool: rawTool } : {}),
					message: `the entry is not { "tool", "args"?, "as"? }:\n${z.prettifyError(parsed.error)}`,
				},
			};
		}
		const entry = parsed.data;
		if (entry.as !== undefined) {
			const earlierIndex = indexByName.get(entry.as);
			if (earlierIndex !== undefined) {
				return {
					ok: false,
					error: {
						index,
						tool: entry.tool,
						as: entry.as,
						message: `"as": "${entry.as}" already names entry ${earlierIndex}`,
					},
				};
			}
			indexByName.set(entry.as, index);
		}
		entries.push(entry);
	}
	return { ok: true, entries };
};

/** Whether nothing is at a path, as opposed to something unreadable. */
const isMissingFile = async (filePath: string): Promise<boolean> => {
	try {
		await access(filePath);
		return false;
	} catch (error) {
		return isErrnoWithCode(error, "ENOENT");
	}
};

/**
 * Applies a batch of tool calls to one file in memory, in order, and writes the
 * result back once — or not at all.
 *
 * Each entry has its references resolved when asked to (see
 * resolveBatchReferences), its arguments checked against the tool's strict schema and its op applied through
 * applyCanvasOp, as jiscribe-mcp applies a call. The first entry that fails ends
 * the run with nothing written. The file is written only when some op changed
 * the document, through saveCanvasFile, whose refusal (findings the edit would
 * add, a file changed or created meanwhile) is a failure like any other.
 *
 * @param filePath - Absolute path, already through toCanvasFilePath
 * @param entries - The checked batch (parseBatchEntries); an empty one reads the file and writes nothing
 * @param options - `create`: start from an empty document when nothing is at `filePath`; it is written only if the path is still empty then, so a run that fails leaves no file behind and a file that appeared meanwhile is kept. Without it a missing file is a failure. `resolvesReferences`: read `$name` / `$$` in the arguments (a batch); false passes every string as given (a single tool)
 */
export const applyOpBatch = async (
	filePath: string,
	entries: readonly BatchEntry[],
	options: { create: boolean; resolvesReferences: boolean },
): Promise<OpReport> => {
	const results: OpEntryResult[] = [];
	const fail = (error: OpFailure): OpReport => ({
		ok: false,
		written: false,
		file: filePath,
		results,
		error,
	});

	let loaded: LoadedCanvasFile | undefined;
	let currentDoc: CanvasDoc;
	if (await isMissingFile(filePath)) {
		if (!options.create) {
			return fail({
				message: `${filePath} does not exist (pass --create to start a new document there)`,
			});
		}
		currentDoc = createEmptyCanvasDoc();
	} else {
		try {
			loaded = await loadCanvasFile(filePath);
		} catch (error) {
			return fail({
				message: error instanceof Error ? error.message : String(error),
			});
		}
		currentDoc = loaded.doc;
	}

	let isReplaced = false;
	const docBridge = {
		getDoc: () => currentDoc,
		replaceDoc: (replacement: CanvasDoc) => {
			currentDoc = replacement;
			isReplaced = true;
		},
	};
	// Nothing reads it (undo is refused), but applyCanvasOp records every change
	const history = createCanvasOpHistory();
	const createdIdsByName = new Map<string, readonly string[]>();

	for (const [index, entry] of entries.entries()) {
		const entryLabel = {
			index,
			tool: entry.tool,
			...(entry.as === undefined ? {} : { as: entry.as }),
		};
		const lookup = findDocTool(entry.tool);
		if (!lookup.ok) {
			return fail({ ...entryLabel, message: lookup.message });
		}
		let resolvedArgs: unknown = entry.args ?? {};
		try {
			if (options.resolvesReferences) {
				resolvedArgs = resolveBatchReferences(resolvedArgs, createdIdsByName);
			}
		} catch (error) {
			if (error instanceof BatchReferenceError) {
				return fail({ ...entryLabel, message: error.message });
			}
			throw error;
		}
		const parsedArgs = toArgsSchema(lookup.descriptor).safeParse(resolvedArgs);
		if (!parsedArgs.success) {
			return fail({
				...entryLabel,
				message: `invalid arguments for ${entry.tool}:\n${z.prettifyError(parsedArgs.error)}`,
			});
		}

		let outcome: AiCanvasOpOutcome;
		try {
			const op = lookup.descriptor.toOp(parsedArgs.data);
			if (!isAiDocOp(op)) {
				// Only when a declaration's `drives` and where its toOp goes disagree
				return fail({
					...entryLabel,
					message: toDrivesMismatchText(lookup.descriptor),
				});
			}
			outcome = applyCanvasOp(
				op,
				docBridge,
				history,
				standardDocOps,
				standardCanvasToolSet,
			);
		} catch (error) {
			const text = toThrownText(error, isUserFacingError);
			results.push({
				tool: entry.tool,
				...(entry.as === undefined ? {} : { as: entry.as }),
				ok: false,
				text,
			});
			return fail({ ...entryLabel, message: text.replace(/^error: /, "") });
		}

		results.push({
			tool: entry.tool,
			...(entry.as === undefined ? {} : { as: entry.as }),
			ok: outcome.ok,
			text: toOutcomeText(outcome),
			...(outcome.createdIds === undefined
				? {}
				: { createdIds: outcome.createdIds }),
		});
		if (!outcome.ok) {
			return fail({ ...entryLabel, message: outcome.text });
		}
		if (entry.as !== undefined) {
			createdIdsByName.set(entry.as, outcome.createdIds ?? []);
		}
	}

	if (!isReplaced) {
		return { ok: true, written: false, file: filePath, results };
	}
	try {
		await saveCanvasFile(
			filePath,
			currentDoc,
			loaded === undefined
				? { validatorName: VALIDATOR_NAME, isNewFile: true }
				: { validatorName: VALIDATOR_NAME, loaded },
		);
	} catch (error) {
		return fail({
			message: error instanceof Error ? error.message : String(error),
		});
	}
	return { ok: true, written: true, file: filePath, results };
};

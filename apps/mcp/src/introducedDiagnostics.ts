import { createHash } from "node:crypto";

import type { Diagnostic } from "@jiscribe/doc-tools";
import { validateDoc } from "@jiscribe/doc-tools";

/**
 * How many validated texts keep their diagnostic keys. The baseline of a write is
 * nearly always the text the previous write left, so a handful of files edited
 * in turn is what this has to cover.
 */
const MAX_CACHED_TEXTS = 16;

/**
 * The diagnostic keys of recently validated texts, keyed by the text's SHA-256.
 * Keyed by content rather than by path, so a file changed from outside simply
 * misses instead of answering for what it used to hold.
 */
const diagnosticKeysByDigest = new Map<string, ReadonlyMap<string, number>>();

/**
 * Where an object sits in the document, as the parser spells it
 * (`root[3].children[0]`). The id stands in for it in a key.
 */
const OBJECT_LOCATOR_PATTERN = /root\[\d+\](?:\.children\[\d+\])*/g;

/**
 * One diagnostic as a key that survives its object changing position, so a
 * finding already in the file is still recognized after a reorder, a delete in
 * front of it or a regrouping moved its object to another index.
 */
const toDiagnosticKey = (diagnostic: Diagnostic): string =>
	[
		diagnostic.objectId ?? "",
		(diagnostic.path ?? "").replace(OBJECT_LOCATOR_PATTERN, ""),
		diagnostic.message.replace(OBJECT_LOCATOR_PATTERN, ""),
	].join(" ");

/** How many times each diagnostic key occurs among the diagnostics. */
const countDiagnosticKeys = (
	diagnostics: readonly Diagnostic[],
): Map<string, number> => {
	const counts = new Map<string, number>();
	for (const diagnostic of diagnostics) {
		const key = toDiagnosticKey(diagnostic);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
};

const digestText = (text: string): string =>
	createHash("sha256").update(text).digest("hex");

/** Keeps a text's diagnostic keys, dropping the least recently used past the cap. */
const rememberDiagnosticKeys = (
	digest: string,
	counts: ReadonlyMap<string, number>,
): void => {
	diagnosticKeysByDigest.delete(digest);
	diagnosticKeysByDigest.set(digest, counts);
	if (diagnosticKeysByDigest.size > MAX_CACHED_TEXTS) {
		const oldestDigest = diagnosticKeysByDigest.keys().next().value;
		if (oldestDigest !== undefined) {
			diagnosticKeysByDigest.delete(oldestDigest);
		}
	}
};

/** The diagnostic keys of a text, validated only when no earlier call has seen the same text. */
const readDiagnosticKeys = (text: string): ReadonlyMap<string, number> => {
	const digest = digestText(text);
	const cached = diagnosticKeysByDigest.get(digest);
	if (cached !== undefined) {
		rememberDiagnosticKeys(digest, cached);
		return cached;
	}
	const counts = countDiagnosticKeys(validateDoc(text).diagnostics);
	rememberDiagnosticKeys(digest, counts);
	return counts;
};

/**
 * What `diagnose_canvas` would report for `nextText` that `baselineText` did not
 * already carry — the check a write-back runs so that an edit never leaves a file
 * in a worse state than it found it.
 *
 * Severity is not looked at. An error the edit introduced is a document that no
 * longer opens; a warning it introduced is a field the parser reports and drops
 * the next time the file is saved, which is the silent loss this refusal exists
 * to prevent. Both are held against the edit.
 *
 * The comparison is against the file as it was, not against a clean file: a
 * document already carrying a finding of its own (a key the format does not know,
 * a type the shipped set lacks) stays editable, and only what the edit itself
 * added is held against it. A finding counts as the same one when it names the
 * same object id, the same property within it and the same complaint, wherever
 * that object moved; an object with no id is told apart by the complaint alone.
 *
 * Both texts go through `validateDoc` (the canvas parser, the validator
 * `diagnose_canvas` runs). The diagnostic keys of a validated text are cached by
 * its digest, so the baseline of a write following one of this process's own
 * writes is not validated a second time.
 *
 * @param baselineText The file's text as the edit read it; undefined for a file
 *   being created, which then has nothing to tolerate
 * @param nextText The text about to be written
 * @returns The diagnostics only `nextText` has, in the order `validateDoc` reports
 *   them; empty when the edit introduced none
 */
export function findIntroducedDiagnostics(
	baselineText: string | undefined,
	nextText: string,
): Diagnostic[] {
	const baselineCounts =
		baselineText === undefined
			? new Map<string, number>()
			: readDiagnosticKeys(baselineText);

	const nextDiagnostics = validateDoc(nextText).diagnostics;
	rememberDiagnosticKeys(
		digestText(nextText),
		countDiagnosticKeys(nextDiagnostics),
	);

	const remainingBaseline = new Map(baselineCounts);
	const introduced: Diagnostic[] = [];
	for (const diagnostic of nextDiagnostics) {
		const key = toDiagnosticKey(diagnostic);
		const remaining = remainingBaseline.get(key) ?? 0;
		if (remaining > 0) {
			remainingBaseline.set(key, remaining - 1);
			continue;
		}
		introduced.push(diagnostic);
	}
	return introduced;
}

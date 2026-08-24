/**
 * Runs a command's own `parseArgs` call and turns what it throws into the usage
 * a person can act on.
 *
 * `parseArgs` throws for a misspelled option (`--font-weight` for `--bold`) and
 * for a value where none belongs, and an uncaught one reaches the terminal as a
 * stack trace with the usage nowhere in it. The call is passed in as a thunk so
 * each command keeps its own option table and the types it infers from it.
 *
 * @param usage - The command's usage text, written to stderr under the error; it is printed as given, so it has to end in a newline
 * @param parse - The `parseArgs` call to run, typically an arrow returning it directly
 * @returns What `parseArgs` returned, or `null` once the error and the usage have been printed — the caller exits 2 on `null`
 */
export const parseCommandArgs = <TParsed>(
	usage: string,
	parse: () => TParsed,
): TParsed | null => {
	try {
		return parse();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// Node appends "To specify a positional argument starting with a '-', ..."
		// boilerplate (with unbalanced quoting) after the first sentence; the usage
		// printed below covers that ground, so only the first sentence is kept.
		const firstSentence = message.split(". ", 1)[0].replace(/\.?$/, ".");
		process.stderr.write(`error: ${firstSentence}\n${usage}`);
		return null;
	}
};

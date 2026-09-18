/**
 * Path arithmetic over the destinations "Set up AI" writes to, with no VSCode
 * in it: setupAi.ts turns the results into URIs and stats them itself.
 */

/**
 * Every directory that has to exist for the given destinations, parents first.
 *
 * The caller walks these to check what it is about to write through, so a
 * parent has to come before its children: the outermost symbolic link is the
 * one worth naming.
 *
 * @param destinationPaths - the destination files as workspace-relative segments (`[".claude", "skills", "jiscribe", "SKILL.md"]`); the last segment is the file and contributes no directory
 * @returns each directory once, as segments, parents before children and in the order the destinations were given; empty when every destination sits at the workspace root
 */
export function collectDirectoryPrefixes(
	destinationPaths: readonly (readonly string[])[],
): string[][] {
	const prefixes: string[][] = [];
	const collected = new Set<string>();
	for (const segments of destinationPaths) {
		for (let depth = 1; depth < segments.length; depth += 1) {
			const prefix = segments.slice(0, depth);
			const key = prefix.join("/");
			if (collected.has(key)) {
				continue;
			}
			collected.add(key);
			prefixes.push(prefix);
		}
	}
	return prefixes;
}

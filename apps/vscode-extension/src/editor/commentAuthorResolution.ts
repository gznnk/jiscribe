/**
 * Deciding the display name the canvas writes onto comments, minus VSCode: the
 * blank handling and the `git config user.name` lookup. resolveCommentAuthor
 * reads the setting off the workspace configuration and injects a real
 * `execFile` as the {@link CommandRunner} here, so this half can be unit-tested
 * (the docImageResolution / resolveDocImage split is the same arrangement).
 */

/**
 * Runs an external command and resolves its captured output. Modelled on
 * `promisify(execFile)`: a non-zero exit, a missing executable and a timeout all
 * reject.
 */
export type CommandRunner = (
	file: string,
	args: readonly string[],
	options: { cwd: string; timeout: number },
) => Promise<{ stdout: string }>;

/** How long `git config user.name` may take before it is given up on. */
export const GIT_USER_NAME_TIMEOUT_MS = 2_000;

/**
 * Trim a configured name down to what can actually be written onto a comment.
 *
 * @param value - the raw setting value; undefined, null and a string of nothing
 *   but whitespace all mean "not configured"
 * @returns the trimmed name, or undefined when nothing is left of it
 */
export function normalizeCommentAuthor(
	value: string | undefined | null,
): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

/**
 * Read `user.name` from the git configuration in effect for a directory.
 *
 * Every failure — git not installed, the directory outside a repository, no
 * `user.name` set, the timeout — is answered with undefined rather than a
 * rejection: a missing author only makes the comment panel read-only, which is
 * not worth interrupting the editor for.
 *
 * @param directory - working directory of the git call, which is what decides
 *   the repository whose configuration is read; it need not exist
 * @param runCommand - runs the git process; rejecting counts as "no name"
 * @returns the trimmed `user.name`, or undefined when it cannot be had
 */
export async function readGitUserName(
	directory: string,
	runCommand: CommandRunner,
): Promise<string | undefined> {
	try {
		const { stdout } = await runCommand("git", ["config", "user.name"], {
			cwd: directory,
			timeout: GIT_USER_NAME_TIMEOUT_MS,
		});
		return normalizeCommentAuthor(stdout);
	} catch {
		return undefined;
	}
}

/**
 * Pick the display name for comments: the configured one, else the repository's
 * git `user.name`.
 *
 * @param configuredAuthor - the `jiscribe.commentAuthor` setting's value; blank
 *   (its default) falls through to git, and a non-blank one is taken as-is
 *   without git being run at all
 * @param directory - working directory for the git lookup, normally the edited
 *   document's folder
 * @param runCommand - runs the git process (see {@link readGitUserName})
 * @returns the trimmed name, or undefined when neither source has one — which
 *   is what leaves the canvas' comment panel read-only
 */
export async function pickCommentAuthor(
	configuredAuthor: string | undefined | null,
	directory: string,
	runCommand: CommandRunner,
): Promise<string | undefined> {
	return (
		normalizeCommentAuthor(configuredAuthor) ??
		(await readGitUserName(directory, runCommand))
	);
}

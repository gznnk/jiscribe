/**
 * How the e2e suites wait.
 *
 * VSCode reports most of what these tests assert with no event to await:
 * diagnostics land some time after the document opens, a tab's state settles
 * after the command that opened it resolves, and an externally changed document
 * reloads on a watcher tick. So the suites poll, and the timeout is a failure
 * budget rather than an expected wait.
 */

/**
 * Poll until `predicate` holds.
 *
 * @param predicate - evaluated immediately and then every 50 ms; may be async
 * @param description - what was being waited for, quoted verbatim in the
 *   timeout error so a failing run says what never happened
 * @param timeoutMs - budget before rejecting; 5000 by default, which is well
 *   clear of the latencies observed here and still inside mocha's per-test limit
 */
export async function waitFor(
	predicate: () => boolean | Promise<boolean>,
	description: string,
	timeoutMs = 5000,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		if (await predicate()) {
			return;
		}
		if (Date.now() >= deadline) {
			throw new Error(
				`Timed out after ${timeoutMs} ms waiting for ${description}`,
			);
		}
		await delay(50);
	}
}

/**
 * Sleep, for the assertions that something does *not* happen.
 *
 * @param durationMs - length of the quiet window an assertion then checks; never
 *   a guess at how long an operation takes, which is what {@link waitFor} is for
 */
export function delay(durationMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, durationMs));
}

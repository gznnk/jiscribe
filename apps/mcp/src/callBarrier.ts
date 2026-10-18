/**
 * Starts one call and counts it as in the air until it settles.
 *
 * @param start Called at once, before track returns, so a call is counted from
 *   the moment it arrives rather than from its first await
 * @returns What start returned, settling the same way
 */
export type TrackCall = <T>(start: () => Promise<T>) => Promise<T>;

export type CallBarrier = {
	/** Runs a call the barrier is to hold a later waiter behind (see TrackCall) */
	track: TrackCall;
	/**
	 * Waits out the calls tracked before this one was made. A call tracked after
	 * it is not waited for, so a stream of calls arriving behind cannot hold the
	 * waiter up for ever.
	 *
	 * @returns A promise settling once each of those calls has settled, whether it
	 *   fulfilled or rejected; it never rejects itself
	 */
	waitForTrackedCalls: () => Promise<void>;
};

/**
 * Creates the barrier a screen tool waits behind: it is answered from the
 * viewer, which draws what the file held when it was last told of it, so a
 * file call that arrived ahead of it has to have landed first.
 */
export function createCallBarrier(): CallBarrier {
	// Removed as each settles, so this holds only what is still in the air
	const inFlightCalls = new Set<Promise<unknown>>();

	return {
		track: <T>(start: () => Promise<T>): Promise<T> => {
			const started = start();
			const settled = started.then(
				() => undefined,
				() => undefined,
			);
			inFlightCalls.add(settled);
			void settled.then(() => {
				inFlightCalls.delete(settled);
			});
			return started;
		},
		waitForTrackedCalls: async () => {
			await Promise.all([...inFlightCalls]);
		},
	};
}

/**
 * Guards that each save request (saveNonce) is delivered to the host at most
 * once.
 *
 * A boundary flush (keyup / blur / unmount) can run before the schedule effect
 * of the commit it just delivered: useNotifySaveRequest mirrors state in a
 * layout effect but schedules in a passive one, so the flush may read a state
 * whose own schedule has not run yet. That commit's follow-up schedule must
 * not deliver the same save a second time.
 *
 * Only the immediately preceding delivery is remembered — nonces are one-shot
 * UUIDs, so the same nonce can never legitimately come back later.
 *
 * Extracted from useNotifySaveRequest so the dedup rule is testable.
 */
export const createNonceDeliveryGuard = (): {
	shouldDeliver: (nonce: string) => boolean;
} => {
	let lastDeliveredNonce: string | null = null;

	return {
		/** Returns true exactly once per nonce; a repeat of the last delivered nonce is rejected. */
		shouldDeliver(nonce: string): boolean {
			if (nonce === lastDeliveredNonce) {
				return false;
			}
			lastDeliveredNonce = nonce;
			return true;
		},
	};
};

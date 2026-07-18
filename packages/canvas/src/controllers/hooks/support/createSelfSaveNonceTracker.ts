/**
 * Tracks the self-save nonces that have been delivered to the host but whose
 * fold-back (the host echoing our own save back as a SYNC_EXTERNAL) has not yet
 * been consumed.
 *
 * Why a set instead of a single value: the host echoes each delivered save back
 * with its nonce, but deliveries can overlap. If commit A is delivered and then
 * commit B is delivered before A's fold-back returns (slow file save, e.g. a
 * remote FS), a single last-nonce field already holds B's nonce by the time A's
 * fold-back arrives — so A's fold-back mismatches and is misclassified as a
 * genuine external change (clearing selection, interrupting the in-progress
 * gesture, adding a spurious history entry). Keeping every undelivered nonce in
 * a set and consuming on match makes the classification robust to out-of-order
 * fold-backs (issue #29).
 *
 * Consumption is expected on every fold-back (see useSyncExternalDoc, which
 * consumes even when it then skips the dispatch for a content-identical doc), so
 * in normal operation the set drains to empty. The cap is a defensive backstop
 * for a host that never echoes a delivered save: without it a dropped echo would
 * leak one entry forever. Evicting the oldest is safe because an unacknowledged
 * save that old can no longer be racing an in-flight fold-back.
 *
 * Extracted (like createNonceDeliveryGuard) so the rule is testable in isolation.
 */

/**
 * Upper bound on retained undelivered nonces. Far above the handful of saves
 * that can realistically be in flight at once; only reached if the host stops
 * echoing.
 */
const MAX_PENDING_NONCES = 64;

export const createSelfSaveNonceTracker = (): {
	register: (nonce: string) => void;
	consumeIfSelfSave: (nonce: string | undefined) => boolean;
} => {
	// Set preserves insertion order, so the first entry is always the oldest.
	const pending = new Set<string>();

	return {
		/** Records a nonce that was just delivered to the host, awaiting fold-back. */
		register(nonce: string): void {
			pending.add(nonce);
			if (pending.size > MAX_PENDING_NONCES) {
				const oldest = pending.values().next().value;
				if (oldest !== undefined) {
					pending.delete(oldest);
				}
			}
		},
		/**
		 * Returns true if the nonce is one of our own undelivered saves (and
		 * consumes it), false for a genuine external change or an unknown nonce.
		 */
		consumeIfSelfSave(nonce: string | undefined): boolean {
			if (nonce === undefined) {
				return false;
			}
			return pending.delete(nonce);
		},
	};
};

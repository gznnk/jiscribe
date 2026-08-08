import { createSelfSaveNonceTracker } from "./support/createSelfSaveNonceTracker";
import { useConstant } from "./useConstant";

/**
 * Provides the self-save nonce tracker as a single instance stable for the
 * component's lifetime. Share the returned tracker between useNotifySaveRequest
 * (which registers each delivered save nonce) and useSyncExternalDoc (which
 * consumes a fold-back's nonce) so overlapping saves that fold back out of
 * order are still recognized as self-saves (issue #29).
 */
export const useSelfSaveNonceTracker = (): ReturnType<
	typeof createSelfSaveNonceTracker
> => useConstant(createSelfSaveNonceTracker);

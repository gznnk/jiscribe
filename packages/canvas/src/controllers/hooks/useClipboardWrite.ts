import { useEffect } from "react";

import type { NotifyError } from "./useErrorNotification";
import type { ClipboardData } from "../commands/selection/ClipboardData";

/**
 * Custom hook that writes changes to the internal clipboard (Copy / Cut) to the OS clipboard.
 *
 * Keeping this side effect outside Command.execute preserves the pure-function contract of commands.
 *
 * @param internalClipboard - current value of the Canvas internal clipboard
 * @param notifyError - error-toast notifier, called on each write failure
 */
export const useClipboardWrite = (
	internalClipboard: ClipboardData | null,
	notifyError: NotifyError,
): void => {
	useEffect(() => {
		if (!internalClipboard) {
			return;
		}
		navigator.clipboard
			.writeText(JSON.stringify(internalClipboard))
			.catch(() => {
				notifyError("clipboardWriteError");
			});
	}, [internalClipboard, notifyError]);
};

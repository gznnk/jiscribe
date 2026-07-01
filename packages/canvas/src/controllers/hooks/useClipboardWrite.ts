import { useEffect, useState } from "react";

import type { ClipboardData } from "../commands/selection/ClipboardData";

/**
 * Custom hook that writes changes to the internal clipboard (Copy / Cut) to the OS clipboard.
 *
 * Keeping this side effect outside Command.execute preserves the pure-function contract of commands.
 *
 * @param internalClipboard - current value of the Canvas internal clipboard
 * @returns an error version that increments on each write failure
 */
export const useClipboardWrite = (
	internalClipboard: ClipboardData | null,
): number => {
	const [clipboardWriteErrorVersion, setClipboardWriteErrorVersion] =
		useState(0);

	useEffect(() => {
		if (!internalClipboard) {
			return;
		}
		navigator.clipboard
			.writeText(JSON.stringify(internalClipboard))
			.catch(() => {
				setClipboardWriteErrorVersion((v) => v + 1);
			});
	}, [internalClipboard]);

	return clipboardWriteErrorVersion;
};

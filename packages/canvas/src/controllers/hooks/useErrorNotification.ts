import { useCallback, useState } from "react";

import type { CanvasMessageStrings } from "../messages/CanvasMessages";

/**
 * Error to show in the ErrorToast. `version` bumps on every notify so
 * repeated errors with the same message restart the toast.
 */
export type ErrorNotification = {
	messageKey: keyof CanvasMessageStrings;
	version: number;
};

export type NotifyError = (messageKey: keyof CanvasMessageStrings) => void;

type UseErrorNotificationResult = {
	errorNotification: ErrorNotification | null;
	notifyError: NotifyError;
};

/**
 * Owns the single error-toast slot shared by all error sources
 * (last-write-wins). `notifyError` is referentially stable.
 */
export const useErrorNotification = (): UseErrorNotificationResult => {
	const [errorNotification, setErrorNotification] =
		useState<ErrorNotification | null>(null);

	const notifyError = useCallback<NotifyError>((messageKey) => {
		setErrorNotification((prev) => ({
			messageKey,
			version: (prev?.version ?? 0) + 1,
		}));
	}, []);

	return { errorNotification, notifyError };
};

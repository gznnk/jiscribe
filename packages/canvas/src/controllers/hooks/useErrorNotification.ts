import { useCallback, useState } from "react";

import type { CanvasMessageStrings } from "../messages/CanvasMessages";

/**
 * Error to show in the ErrorToast. Every notify creates a fresh object, so
 * the toast restarts via object identity even for a repeated messageKey.
 */
export type ErrorNotification = {
	messageKey: keyof CanvasMessageStrings;
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
		setErrorNotification({ messageKey });
	}, []);

	return { errorNotification, notifyError };
};

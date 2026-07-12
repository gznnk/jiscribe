import { useEffect, useRef, useState } from "react";

import { Toast } from "./ErrorToastStyled";
import type { ErrorNotification } from "../../../hooks/useErrorNotification";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";

const DISPLAY_DURATION_MS = 4000;

type ErrorToastProps = {
	notification: ErrorNotification | null;
};

export const ErrorToast = ({ notification }: ErrorToastProps) => {
	const messages = useCanvasMessages();
	const [visible, setVisible] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!notification) {
			return;
		}

		setVisible(true);

		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => {
			setVisible(false);
			timerRef.current = null;
		}, DISPLAY_DURATION_MS);
	}, [notification]);

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	return (
		<Toast visible={visible}>
			{notification ? messages[notification.messageKey] : null}
		</Toast>
	);
};

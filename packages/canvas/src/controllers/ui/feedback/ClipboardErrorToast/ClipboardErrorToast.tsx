import { useEffect, useRef, useState } from "react";

import { Toast } from "./ClipboardErrorToastStyled";

const DISPLAY_DURATION_MS = 4000;

type ClipboardErrorToastProps = {
	errorVersion: number;
};

export const ClipboardErrorToast = ({
	errorVersion,
}: ClipboardErrorToastProps) => {
	const [visible, setVisible] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		if (errorVersion === 0) {
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
	}, [errorVersion]);

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	return (
		<Toast visible={visible}>
			クリップボードへの書き込みに失敗しました。アプリ内のペーストは利用できます。
		</Toast>
	);
};

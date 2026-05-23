import { useEffect, useRef, useState } from "react";

import { Label } from "./ZoomIndicatorStyled";

const DISPLAY_DURATION_MS = 1500;

type ZoomIndicatorProps = {
	zoom: number;
};

export const ZoomIndicator = ({ zoom }: ZoomIndicatorProps) => {
	const [visible, setVisible] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
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
	}, [zoom]);

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	return <Label visible={visible}>{Math.round(zoom * 100)}%</Label>;
};

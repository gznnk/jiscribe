import { useEffect, useState } from "react";

/**
 * Manages Ctrl key press state and provides access to it across components.
 * This hook sets up global keyboard event listeners to track Ctrl key state.
 *
 * @returns Object containing the current Ctrl key state
 */
export const useCtrl = () => {
	const [isCtrlPressed, setIsCtrlPressed] = useState(false);

	useEffect(() => {
		const onDocumentKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Control") {
				setIsCtrlPressed(true);
			}
		};

		const onDocumentKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Control") {
				setIsCtrlPressed(false);
			}
		};

		// Handle focus/blur events to reset state when window loses focus
		const handleBlur = () => {
			setIsCtrlPressed(false);
		};

		// Add event listeners for keydown and keyup events
		document.addEventListener("keydown", onDocumentKeyDown);
		document.addEventListener("keyup", onDocumentKeyUp);
		window.addEventListener("blur", handleBlur);

		return () => {
			document.removeEventListener("keydown", onDocumentKeyDown);
			document.removeEventListener("keyup", onDocumentKeyUp);
			window.removeEventListener("blur", handleBlur);
		};
	}, []);

	return { isCtrlPressed };
};

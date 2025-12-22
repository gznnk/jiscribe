import type { ArrowKeyCode } from "../../types/core/ArrowKeyCode";

export const isArrowKeyCode = (key: string): key is ArrowKeyCode => {
	return (
		key === "ArrowUp" ||
		key === "ArrowDown" ||
		key === "ArrowLeft" ||
		key === "ArrowRight"
	);
};

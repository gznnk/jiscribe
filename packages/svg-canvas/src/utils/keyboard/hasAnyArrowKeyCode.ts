export const hasAnyArrowKeyCode = (keys: Set<string>): boolean => {
	return (
		keys.has("ArrowUp") ||
		keys.has("ArrowDown") ||
		keys.has("ArrowLeft") ||
		keys.has("ArrowRight")
	);
};

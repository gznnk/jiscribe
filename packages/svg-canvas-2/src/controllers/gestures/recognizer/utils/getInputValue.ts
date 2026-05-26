export const getInputValue = (
	target: EventTarget | null,
): string | undefined => {
	if (!(target instanceof HTMLInputElement)) {
		return undefined;
	}
	if (target.getAttribute("data-interactive") !== "true") {
		return undefined;
	}
	return target.value;
};

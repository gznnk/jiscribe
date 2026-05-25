export const shouldPreserveNativeBehavior = (
	target: EventTarget | null,
): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	return target.getAttribute("data-interactive") === "true";
};

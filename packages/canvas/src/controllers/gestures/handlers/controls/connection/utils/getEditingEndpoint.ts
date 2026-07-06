/**
 * Gets the endpoint being edited from a control's targetPart.
 * "endpoint:source" -> "source"
 * "endpoint:target" -> "target"
 * Creation mode ("anchor:...") or a format mismatch falls back to "target"
 * (the default).
 */
export function getEditingEndpoint(
	targetPart: string | undefined,
): "source" | "target" {
	if (targetPart === "endpoint:source" || targetPart === "endpoint:target") {
		return targetPart.slice("endpoint:".length) as "source" | "target";
	}

	// Default to "target" for creation mode
	return "target";
}

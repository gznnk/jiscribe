/**
 * Classification of a frame's rotation relative to its transform root group.
 * "parallel" (0/180 deg) and "orthogonal" (90/270 deg) children scale exactly
 * under a group resize; "oblique" children fall back to an approximation
 * (see transformFrameByGroup), so their transform is not an exact affine map.
 */
export type ChildRelativeRotationClass = "parallel" | "orthogonal" | "oblique";

/**
 * Classifies a child's rotation relative to its transform root group.
 * Single source of truth for the exact/approximate branch of transformFrameByGroup.
 */
export function classifyChildRelativeRotation(
	childRotationDeg: number,
	groupRotationDeg: number,
): ChildRelativeRotationClass {
	const childRelativeRotationDeg =
		(childRotationDeg - groupRotationDeg + 360) % 360;

	if (
		Math.abs(childRelativeRotationDeg) < 0.001 ||
		Math.abs(childRelativeRotationDeg - 180) < 0.001
	) {
		return "parallel";
	}
	if (
		Math.abs(childRelativeRotationDeg - 90) < 0.001 ||
		Math.abs(childRelativeRotationDeg - 270) < 0.001
	) {
		return "orthogonal";
	}
	return "oblique";
}

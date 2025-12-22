/**
 * Types of stack order changes for diagrams
 */
export type StackOrderChangeType =
	| "bringToFront" // Move to the very front
	| "sendToBack" // Move to the very back
	| "bringForward" // Move one step forward
	| "sendBackward"; // Move one step backward

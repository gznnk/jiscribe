export type ItemableType =
	| "composite" // An item that has its own geometry (its shape is defined intrinsically)
	| "group" // An item that has no intrinsic geometry (its shape is derived from its children)
	| "canvas";

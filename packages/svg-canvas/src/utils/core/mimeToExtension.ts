export const mimeToExtension = (mimeType: string): string => {
	const map: Record<string, string> = {
		"image/png": "png",
		"image/jpeg": "jpg",
		"image/svg+xml": "svg",
		"image/gif": "gif",
		"image/webp": "webp",
		"application/pdf": "pdf",
		"text/plain": "txt",
	};

	return map[mimeType] ?? "txt";
};

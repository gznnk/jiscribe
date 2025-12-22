/**
 * Event fired when files are dropped onto a diagram
 */
export type FileDropEvent = {
	eventId: string;
	id: string;
	files: FileList;
};

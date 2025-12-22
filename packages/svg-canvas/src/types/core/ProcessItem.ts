export type ProcessStatus = "processing" | "success" | "failed";

export type ProcessItem = {
	id: string;
	status: ProcessStatus;
};

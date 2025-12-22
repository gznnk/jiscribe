import { useCallback, useEffect, useRef, useState } from "react";

import type { ProcessItem, ProcessStatus } from "../types/core/ProcessItem";

const CLEANUP_DELAY = 4000; // 4 seconds

export const useProcessManager = () => {
	const [processes, setProcesses] = useState<ProcessItem[]>([]);
	const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

	const addProcess = useCallback((id: string) => {
		setProcesses((prev) => {
			// Check if process already exists
			if (prev.some((p) => p.id === id)) {
				return prev;
			}
			return [...prev, { id, status: "processing" }];
		});
	}, []);

	const updateProcessStatus = useCallback(
		(id: string, status: ProcessStatus) => {
			setProcesses((prev) =>
				prev.map((process) =>
					process.id === id ? { ...process, status } : process,
				),
			);

			// Schedule cleanup for completed processes
			if (status === "success" || status === "failed") {
				const existingTimeout = timeoutsRef.current.get(id);
				if (existingTimeout) {
					clearTimeout(existingTimeout);
				}

				const timeout = setTimeout(() => {
					setProcesses((prev) => prev.filter((p) => p.id !== id));
					timeoutsRef.current.delete(id);
				}, CLEANUP_DELAY);

				timeoutsRef.current.set(id, timeout);
			}
		},
		[],
	);

	const setProcessSuccess = useCallback(
		(id: string) => {
			updateProcessStatus(id, "success");
		},
		[updateProcessStatus],
	);

	const setProcessError = useCallback(
		(id: string) => {
			updateProcessStatus(id, "failed");
		},
		[updateProcessStatus],
	);

	// Cleanup timeouts on unmount
	useEffect(() => {
		const timeouts = timeoutsRef.current;
		return () => {
			timeouts.forEach((timeout) => clearTimeout(timeout));
			timeouts.clear();
		};
	}, []);

	const hasActiveProcess = !!processes.find((p) => p.status === "processing");

	return {
		processes,
		hasActiveProcess,
		addProcess,
		setProcessSuccess,
		setProcessError,
	};
};

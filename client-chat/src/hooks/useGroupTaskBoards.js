import { useState, useEffect, useMemo, useCallback } from "react";
import { taskService } from "../services/taskService";

async function fetchBoardsMap(ids) {
	const entries = await Promise.all(
		ids.map(async (id) => {
			try {
				const res = await taskService.getBoard(id);
				return [id, res.data.data];
			} catch {
				return [id, null];
			}
		}),
	);
	return Object.fromEntries(entries.filter(([, board]) => board != null));
}

/**
 * Ambil board task untuk setiap grup; fetch ulang hanya jika daftar id grup berubah.
 */
export const useGroupTaskBoards = (groupRooms) => {
	const groupRoomIdsKey = useMemo(
		() =>
			groupRooms
				.map((r) => r.id)
				.sort((a, b) => a - b)
				.join(","),
		[groupRooms],
	);

	const [boardsByRoomId, setBoardsByRoomId] = useState({});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!groupRoomIdsKey) {
			/* eslint-disable react-hooks/set-state-in-effect -- reset when no group rooms */
			setBoardsByRoomId({});
			setLoading(false);
			/* eslint-enable react-hooks/set-state-in-effect */
			return;
		}

		const ids = groupRoomIdsKey.split(",").map(Number);
		let cancelled = false;

		const load = async () => {
			setLoading(true);
			setBoardsByRoomId({});

			const next = await fetchBoardsMap(ids);

			if (cancelled) return;

			setBoardsByRoomId(next);
			setLoading(false);
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [groupRoomIdsKey]);

	const refetch = useCallback(
		async (opts = {}) => {
			const quiet = !!opts.quiet;
			if (!groupRoomIdsKey) return;
			const ids = groupRoomIdsKey.split(",").map(Number);
			if (!quiet) setLoading(true);
			const next = await fetchBoardsMap(ids);
			setBoardsByRoomId(next);
			if (!quiet) setLoading(false);
		},
		[groupRoomIdsKey],
	);

	return { boardsByRoomId, loading, groupRoomIdsKey, refetch };
};

/**
 * Format last seen timestamp menjadi teks bahasa Indonesia.
 * */
export function formatLastSeen(date) {
	if (!date) return "Terakhir dilihat baru-baru ini";
	const diffMs = Date.now() - new Date(date).getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);
	if (diffMins < 1) return "Baru saja online";
	if (diffMins < 60) return `Terakhir dilihat ${diffMins} menit lalu`;
	if (diffHours < 24) return `Terakhir dilihat ${diffHours} jam lalu`;
	if (diffDays === 1) return "Terakhir dilihat kemarin";
	return `Terakhir dilihat ${diffDays} hari lalu`;
}

/** @param {Array<{ timestamp: Date | string | number }>} messages */
export function groupMessagesWithDateDividers(messages) {
	return messages.reduce((groups, msg, i) => {
		const msgDate = new Date(msg.timestamp).toDateString();
		const prevDate =
			i > 0 ? new Date(messages[i - 1].timestamp).toDateString() : null;
		if (msgDate !== prevDate) {
			groups.push({
				type: "divider",
				date: msg.timestamp,
				id: `divider_${i}`,
			});
		}
		groups.push({ type: "message", ...msg });
		return groups;
	}, []);
}

export function messageOnlyItems(grouped) {
	return grouped.filter((g) => g.type === "message");
}

export function createShouldShowAvatar(msgItems) {
	return (item) => {
		const idx = msgItems.findIndex((m) => m.id === item.id);
		if (idx < 0) return false;
		const next = msgItems[idx + 1];
		return !next || next.senderId !== item.senderId;
	};
}

export function computeLastReadOwnMessageId(rawMessages, userId, readUpTo) {
	if (readUpTo <= 0) return null;
	const ownSentIds = rawMessages
		.filter(
			(m) =>
				Number(m.sender_id ?? m.from) === Number(userId) &&
				!m.optimistic &&
				Boolean(m.id),
		)
		.map((m) => m.id);
	return ownSentIds.filter((id) => id <= readUpTo).at(-1) ?? null;
}

const STORAGE_KEY = 'recent_opened_tasks_v1';
const MAX_ITEMS = 20;

export const getRecentOpenedTasks = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveRecentOpenedTasks = (items) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota and serialization errors.
  }
};

export const pushRecentOpenedTask = (entry) => {
  const now = new Date().toISOString();
  const nextEntry = {
    ...entry,
    id: Number(entry.id),
    groupId: Number(entry.groupId),
    lastOpenedAt: now,
  };

  const current = getRecentOpenedTasks().filter((item) => Number(item.id) !== Number(nextEntry.id));
  const merged = [nextEntry, ...current].slice(0, MAX_ITEMS);
  saveRecentOpenedTasks(merged);
  return merged;
};

export const reorderRecentOpenedTasks = (fromIndex, toIndex) => {
  const list = [...getRecentOpenedTasks()];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return list;
  }
  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  saveRecentOpenedTasks(list);
  return list;
};

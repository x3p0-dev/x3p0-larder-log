/**
 * Client-side row ids, for as long as rows are client-side. Phase 2 hands this
 * job to the database, which assigns `id` on insert; until then a collision
 * would silently merge two pantry items, so this uses a real random source
 * where one exists.
 */
export function newId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}

	return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

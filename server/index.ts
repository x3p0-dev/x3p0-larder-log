import { capsule, endpoint, text } from '@spacefast/zero/server';

/**
 * The capsule — deliberately empty of schema for now.
 *
 * Phase 1 is the scaffold and the sign-in gate: the client still keeps its data
 * in localStorage, so there is nothing here to store it in yet. Phase 2
 * declares the real schema from `docs/data-model.md` (households, memberships,
 * invites, the three taxonomies, items, and the two join tables) along with the
 * `requireHousehold()` helper every handler has to route through.
 *
 * Getting that schema right before it holds real rows is worth real effort:
 * Zero applies additive changes on publish, but renaming or dropping a field
 * needs an explicit `sf db migrate --rename` / `--drop`.
 */
export default capsule({
	name: 'Larder Log',
	schema: {},
	endpoints: {
		status: endpoint({ method: 'GET', path: '/api/status' }, () => text('ok')),
	},
});

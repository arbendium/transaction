// @ts-check

import { emptyBuffer } from './util.js';

/**
 * @overload
 * @param {import('./types.js').Value} value
 * @param {import('./types.js').Mutation} mutation
 * @returns {import('./types.js').Value}
 */
/**
 * @overload
 * @param {import('./types.js').Value | undefined} value
 * @param {import('./types.js').Mutation} mutation
 * @returns {import('./types.js').Value | undefined}
 */
/**
 * @param {import('./types.js').Value | undefined} value
 * @param {import('./types.js').Mutation} mutation
 * @returns {import('./types.js').Value | undefined}
 */
function applyMutation(value, mutation) {
	if (mutation === 'clear') {
		return undefined;
	}

	if (mutation[0] === 'set') {
		return mutation[1];
	}

	return value ?? emptyBuffer;
}

/**
 * @overload
 * @param {import('./types.js').Value} value
 * @param {import('./types.js').Mutation[] | undefined} mutations
 * @returns {import('./types.js').Value}
 */
/**
 * @overload
 * @param {import('./types.js').Value | undefined} value
 * @param {import('./types.js').Mutation[] | undefined} mutations
 * @returns {import('./types.js').Value | undefined}
 */
/**
 * @param {import('./types.js').Value | undefined} value
 * @param {import('./types.js').Mutation[] | undefined} mutations
 * @returns {import('./types.js').Value | undefined}
 */
function applyMutations(value, mutations) {
	return mutations != null
		? mutations.reduce(applyMutation, value)
		: value;
}

/**
 * @param {import('./types.js').Mutation} mutation
 * @returns {boolean}
 */
function isIndependentMutation(mutation) {
	return mutation === 'clear' || mutation[0] === 'set';
}

/**
 * @param {import('./types.js').Mutation[] | undefined} mutations
 * @returns {boolean}
 */
function includesIndependentMutation(mutations) {
	return mutations != null && mutations.some(isIndependentMutation);
}

/**
 * @param {Pick<import('./types.js').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isEmptyEntry(entry) {
	return isKnown(entry) && applyMutations(entry.value, entry.mutations) === undefined;
}

/**
 * @param {Pick<import('./types.js').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isValueEntry(entry) {
	return isKnown(entry) && applyMutations(entry.value, entry.mutations) !== undefined;
}

/**
 * @param {Pick<import('./types.js').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isKnown(entry) {
	return 'value' in entry || includesIndependentMutation(entry.mutations);
}

/**
 * @param {Buffer} key
 * @param {boolean} inclusive
 * @param {number} offset
 * @param {import('./RangeIndex.js').default<
 *   import('./types.js').RangeIndexEntry,
 *   import('./types.js').RangeIndexAction
 * >} index
 * @returns {import('./types.js').KeySelector | number}
 */
// eslint-disable-next-line import/prefer-default-export
export function resolveCachedKeySelector(key, inclusive, offset, index) {
	let entryIndex = index.ranges.findIndex(
		inclusive
			? ([entryKey]) => Buffer.compare(key, entryKey) >= 0
			: ([entryKey]) => Buffer.compare(key, entryKey) > 0
	);

	for (;;) {
		const currentEntry = index.ranges[entryIndex];

		if (currentEntry[1].entry == null) {
			return { key: currentEntry[0], inclusive, offset };
		}

		if (offset === 0) {
			return entryIndex;
		}

		if (offset < 0) {
			const previousEntry = index.ranges[entryIndex - 1];

			if (!previousEntry) {
				return { key: emptyBuffer, inclusive: true, offset: 0 };
			}

			if (previousEntry[1].entry == null) {
				return { key: currentEntry[0], inclusive: true, offset };
			}

			entryIndex--;
			offset++;
		} else {
			const nextEntry = index.ranges[entryIndex + 1];

			// TODO: check that it's inside the keyspace
			if (!nextEntry) {
				return { key: keyspaceEnd(key), inclusive: false, offset: 1 };
			}

			if (nextEntry[1].entry == null) {
				return { key: nextEntry[0], inclusive: true, offset };
			}

			entryIndex++;
			offset--;
		}
	}
}

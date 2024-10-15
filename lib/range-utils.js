// @ts-check

import assert from 'node:assert';
import { emptyBuffer } from './util.js';

/**
 * @overload
 * @param {import('./types.ts').Value} value
 * @param {import('./types.ts').Mutation} mutation
 * @returns {import('./types.ts').Value}
 */
/**
 * @overload
 * @param {import('./types.ts').Value | undefined} value
 * @param {import('./types.ts').Mutation} mutation
 * @returns {import('./types.ts').Value | undefined}
 */
/**
 * @param {import('./types.ts').Value | undefined} value
 * @param {import('./types.ts').Mutation} mutation
 * @returns {import('./types.ts').Value | undefined}
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
 * @param {import('./types.ts').Value} value
 * @param {import('./types.ts').Mutation[] | undefined} mutations
 * @returns {import('./types.ts').Value}
 */
/**
 * @overload
 * @param {import('./types.ts').Value | undefined} value
 * @param {import('./types.ts').Mutation[] | undefined} mutations
 * @returns {import('./types.ts').Value | undefined}
 */
/**
 * @param {import('./types.ts').Value | undefined} value
 * @param {import('./types.ts').Mutation[] | undefined} mutations
 * @returns {import('./types.ts').Value | undefined}
 */
function applyMutations(value, mutations) {
	return mutations != null
		? mutations.reduce(applyMutation, value)
		: value;
}

/**
 * @param {import('./types.ts').Mutation} mutation
 * @returns {boolean}
 */
function isIndependentMutation(mutation) {
	return mutation === 'clear' || mutation[0] === 'set';
}

/**
 * @param {import('./types.ts').Mutation[] | undefined} mutations
 * @returns {boolean}
 */
function includesIndependentMutation(mutations) {
	return mutations != null && mutations.some(isIndependentMutation);
}

/**
 * @param {Pick<import('./types.ts').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isEmptyEntry(entry) {
	return isKnown(entry) && applyMutations(entry.value, entry.mutations) === undefined;
}

/**
 * @param {Pick<import('./types.ts').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isValueEntry(entry) {
	return isKnown(entry) && applyMutations(entry.value, entry.mutations) !== undefined;
}

/**
 * @param {Pick<import('./types.ts').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isKnown(entry) {
	return 'value' in entry || includesIndependentMutation(entry.mutations);
}

/**
 * @param {Buffer} key
 * @param {boolean} inclusive
 * @param {number} offset
 * @param {import('./RangeIndex.js').default<import('./types.ts').RangeIndexEntry, any>} index
 * @returns {import('./types.ts').KeySelector | Buffer | undefined}
 */
// eslint-disable-next-line import/prefer-default-export
export function resolveCachedKeySelector(key, inclusive, offset, index) {
	let entryIndex = index.ranges.findLastIndex(
		inclusive
			? ([entryKey, entry]) => Buffer.compare(key, entryKey) >= 0 && !isEmptyEntry(entry)
			: ([entryKey, entry]) => Buffer.compare(key, entryKey) > 0 && !isEmptyEntry(entry)
	);

	if (entryIndex < 0) {
		if (offset > 0) {
			entryIndex++;

			while (isKnown(index.ranges[entryIndex][1])) {
				// last entry can not be known
				assert(entryIndex !== index.ranges.length - 1);

				if (isValueEntry(index.ranges[entryIndex][1])) {
					offset--;

					if (offset === 0) {
						return index.ranges[entryIndex][0];
					}
				}

				if (!isKnown(index.ranges[entryIndex + 1][1])) {
					return { key: index.ranges[entryIndex][0], inclusive: true, offset };
				}

				entryIndex++;
			}

			return { key, inclusive, offset };
		}

		return undefined;
	}

	if (!isKnown(index.ranges[entryIndex][1])) {
		if (key.length === 0 && offset < 0) {
			return undefined;
		}

		return { key, inclusive, offset };
	}

	for (;;) {
		const currentEntry = index.ranges[entryIndex];

		assert(isValueEntry(currentEntry[1]));

		if (offset === 0) {
			return currentEntry[0];
		}

		if (offset < 0) {
			if (entryIndex === 0) {
				return undefined;
			}

			entryIndex--;

			if (isEmptyEntry(currentEntry[1])) {
				continue;
			}

			while (entryIndex >= 0 && isEmptyEntry(index.ranges[entryIndex][1])) {
				entryIndex--;
			}

			const previousEntry = index.ranges[entryIndex];

			if (isValueEntry(previousEntry[1])) {
				offset++;
			} else if (!isKnown(previousEntry[1])) {
				return { key: currentEntry[0], inclusive: true, offset };
			} else {
				return undefined;
			}
		} else {
			if (entryIndex === index.ranges.length - 1) {
				return { key: currentEntry[0], inclusive: true, offset };
			}

			entryIndex++;

			if (isEmptyEntry(currentEntry[1])) {
				continue;
			}

			while (entryIndex < index.ranges.length && isEmptyEntry(index.ranges[entryIndex][1])) {
				entryIndex++;
			}

			const nextEntry = index.ranges[entryIndex];

			if (isValueEntry(nextEntry[1])) {
				offset--;
			} else if (!isKnown(nextEntry[1])) {
				return { key: currentEntry[0], inclusive: true, offset };
			} else {
				return { key: nextEntry[0], inclusive: true, offset };
			}
		}
	}
}

// @ts-check

import assert from 'node:assert';
import { applyMutations, isKnown, isValueEntry } from './range-utils.js';
import resolveCachedKeySelector from './resolveCachedKeySelector.js';

/**
 * @typedef {{
 *   startEntries: [Buffer, Buffer][]
 *   endEntries: [Buffer, Buffer][]
 *   selectors?: [import('./types.js').KeySelector, import('./types.js').KeySelector]
 * }} ResolvedRangeKeySelectors
 */

/**
 * @param {import('./types.js').KeySelector} start
 * @param {import('./types.js').KeySelector} end
 * @returns {boolean}
 */
function isEmptyRange(start, end) {
	const cmp = Buffer.compare(start.key, end.key);

	if (start.inclusive <= end.inclusive) {
		if (start.offset >= end.offset) {
			if (cmp >= 0) {
				return true;
			}
		}
	}

	return false;
}

/**
 * @param {import('./types.js').KeySelector} start
 * @param {import('./types.js').KeySelector} end
 * @param {boolean} reverse
 * @param {number} limit
 * @param {import('./RangeIndex.js').default<import('./types.js').RangeIndexEntry, any>} index
 * @returns {{
 *   startEntries: [Buffer, Buffer][]
 *   endEntries: [Buffer, Buffer][]
 *   selectors?: [
 *     import('./types.js').KeySelector,
 *     import('./types.js').KeySelector
 *   ]
 * }}
 */
export default function resolveCachedKeyRangeSelectors(start, end, reverse, limit, index) {
	/**
	 * @type {{
	 *   startEntries: [Buffer, Buffer][]
	 *   endEntries: [Buffer, Buffer][]
	 *   selectors?: [
	 *     import('./types.js').KeySelector,
	 *     import('./types.js').KeySelector
	 *   ]
	 * }}
	 */
	const result = {
		startEntries: [],
		endEntries: []
	};

	const endKeySelector = resolveCachedKeySelector(end, /** @type {any} */(index));

	if (endKeySelector === -1 || endKeySelector === 0) {
		return result;
	}

	const startKeySelector = resolveCachedKeySelector(start, /** @type {any} */(index));

	if (typeof startKeySelector === 'number') {
		return typeof endKeySelector === 'number'
			? fixedStartAndEndEntry(startKeySelector, endKeySelector, reverse, limit, index)
			: fixedStartEntry(startKeySelector, endKeySelector, reverse, limit, index);
	}

	const lastKnownStartEntry = result.startEntries.length
		? result.startEntries[result.startEntries.length - 1]
		: undefined;

	if (typeof endKeySelector === 'number') {
		while (isKnown(index.ranges[endKeySelector - 1][1])) {
			endKeySelector--;

			if (isValueEntry(index.ranges[endKeySelector][1])) {
				if (lastKnownStartEntry != null
					&& endKeySelector === result.startEntries[result.startEntries.length - 1]) {
					return result;
				}

				result.endEntries.push(endKeySelector);
			}

			if (endKeySelector === 0) {
				return result;
			}
		}

		endKeySelector = { key: index.ranges[endKeySelector][0], inclusive: false, offset: 1 };
	}

	if (!isEmptyRange(startKeySelector, endKeySelector)) {
		result.selectors = [
			startKeySelector,
			endKeySelector
		];
	}

	return result;
}

/**
 * @param {number} start
 * @param {number} end
 * @param {boolean} reverse
 * @param {number} limit
 * @param {import('./RangeIndex.js').default<import('./types.js').RangeIndexEntry, any>} index
 * @returns {ResolvedRangeKeySelectors}
 */
function fixedStartAndEndEntry(start, end, reverse, limit, index) {
	/** @type {ResolvedRangeKeySelectors} */
	const result = {
		startEntries: [],
		endEntries: []
	};

	if (start < 0) {
		start = 0;
	}

	if (reverse) {
		while (start < end) {
			const [key, entry] = index.ranges[end - 1];

			if (!isKnown(entry)) {
				break;
			}

			const value = applyMutations(entry.value, entry.mutations);

			if (value !== undefined) {
				result.startEntries.push([key, value]);

				if (limit > 0 && --limit === 0) {
					return result;
				}
			}

			end--;
		}

		while (start < end) {
			const [key, entry] = index.ranges[start];

			if (!isKnown(entry)) {
				result.selectors = [
					{ key: index.ranges[start][0], inclusive: false, offset: 1 },
					{ key: index.ranges[end][0], inclusive: false, offset: 1 }
				];

				break;
			}

			const value = applyMutations(entry.value, entry.mutations);

			if (value !== undefined) {
				result.endEntries.push([key, value]);
			}

			start++;
		}
	} else {
		while (start < end) {
			const [key, entry] = index.ranges[start];

			if (!isKnown(entry)) {
				break;
			}

			const value = applyMutations(entry.value, entry.mutations);

			if (value !== undefined) {
				result.startEntries.push([key, value]);

				if (limit > 0 && --limit === 0) {
					return result;
				}
			}

			start++;
		}

		while (start < end) {
			const [key, entry] = index.ranges[end - 1];

			if (!isKnown(entry)) {
				result.selectors = [
					{ key: index.ranges[start][0], inclusive: false, offset: 1 },
					{ key: index.ranges[end][0], inclusive: false, offset: 1 }
				];

				break;
			}

			const value = applyMutations(entry.value, entry.mutations);

			if (value !== undefined) {
				result.endEntries.push([key, value]);
			}

			end--;
		}
	}

	result.endEntries.reverse();

	if (limit !== 0 && result.endEntries.length > limit) {
		result.endEntries.length = limit;
	}

	return result;
}

/**
 * @param {number} start
 * @param {import('./types.js').KeySelector<number | Buffer>} end
 * @param {boolean} reverse
 * @param {number} limit
 * @param {import('./RangeIndex.js').default<import('./types.js').RangeIndexEntry, any>} index
 * @returns {ResolvedRangeKeySelectors}
 */
function fixedStartEntry(start, end, reverse, limit, index) {
	assert(reverse === false);

	const endIndex = typeof end.key === 'number'
		? end.key
		: index.ranges.findIndex(([key]) => Buffer.compare(key, /** @type {Buffer} */(end.key)) <= 0);

	/** @type {ResolvedRangeKeySelectors} */
	const result = {
		startEntries: [],
		endEntries: []
	};

	if (start < 0) {
		start = 0;
	}

	if (start >= endIndex) {
		if (end.offset <= 0) {
			return result;
		}

		let endOffset = end.offset;

		for (let i = start - 1; i > endOffset; i--) {
			if (!isKnown(index.ranges[i][1])) {
				break;
			}

			if (isValueEntry(index.ranges[i][1]) && --endOffset === 0) {
				return result;
			}
		}

		result.selectors = [
			{ key: index.ranges[start][0], inclusive: false, offset: 1 },
			typeof end.key === 'number'
				? { ...end, key: index.ranges[end.key][0] }
				: /** @type {import('./types.js').KeySelector} */(end)
		];

		return result;
	}

	while (start < end) {
		const [key, entry] = index.ranges[start];

		if (!isKnown(entry)) {
			break;
		}

		const value = applyMutations(entry.value, entry.mutations);

		if (value !== undefined) {
			result.startEntries.push([key, value]);

			if (limit > 0 && --limit === 0) {
				return result;
			}
		}

		start++;
	}

	while (start < end) {
		const [key, entry] = index.ranges[end - 1];

		if (!isKnown(entry)) {
			break;
		}

		const value = applyMutations(entry.value, entry.mutations);

		if (value !== undefined) {
			result.endEntries.push([key, value]);
		}

		end--;
	}

	if (start < end) {
		result.selectors = [
			{ key: index.ranges[start][0], inclusive: false, offset: 1 },
			{ key: index.ranges[end][0], inclusive: false, offset: 1 }
		];
	}

	result.endEntries.reverse();

	if (limit !== 0 && result.endEntries.length > limit) {
		result.endEntries.length = limit;
	}

	return result;
}

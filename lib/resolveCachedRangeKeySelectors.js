// @ts-check

import { isKnown, isValueEntry } from './range-utils.js';
import resolveCachedKeySelector from './resolveCachedKeySelector.js';

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
 * @param {import('./RangeIndex.js').default<import('./types.js').RangeIndexEntry, any>} index
 * @returns {{
 *   startEntries: number[]
 *   endEntries: number[]
 *   selectors?: [
 *     import('./types.js').KeySelector,
 *     import('./types.js').KeySelector
 *   ]
 * }}
 */
export default function resolveCachedRangeKeySelectors(start, end, index) {
	/**
	 * @type {{
	 *   startEntries: number[]
	 *   endEntries: number[]
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

	let endKeySelector = resolveCachedKeySelector(end, /** @type {any} */(index));

	if (endKeySelector === 0) {
		return result;
	}

	let startKeySelector = resolveCachedKeySelector(start, /** @type {any} */(index));

	if (typeof startKeySelector === 'number') {
		if (isValueEntry(index.ranges[startKeySelector][1])) {
			result.startEntries.push(startKeySelector);
		}

		while (isKnown(index.ranges[startKeySelector + 1][1])) {
			startKeySelector++;

			if (isValueEntry(index.ranges[startKeySelector][1])) {
				result.startEntries.push(startKeySelector);
			}
		}

		startKeySelector = { key: index.ranges[startKeySelector][0], inclusive: true, offset: 1 };
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

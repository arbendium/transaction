// @ts-check

import assert from 'node:assert';
import { isEmptyEntry, isKnown, isValueEntry } from './range-utils.js';

/**
 * @param {import('./types.js').KeySelector} selector
 * @param {import('./RangeIndex.js').default<import('./types.js').RangeIndexEntry, any>} index
 * @returns {number | import('./types.js').KeySelector<Buffer | number>}
 */
export default function resolveCachedKeySelector({ key, inclusive, offset }, index) {
	if (key.length === 0 && offset < 0) {
		return -1;
	}

	let entryIndex = index.ranges.length - 1;
	let exactEntry = false;

	while (entryIndex !== -1) {
		const [entryKey, entry] = index.ranges[entryIndex];

		const cmp = Buffer.compare(key, entryKey);

		if (cmp === 0) {
			exactEntry = true;
		}

		if ((inclusive ? cmp >= 0 : cmp > 0) && !isEmptyEntry(entry)) {
			break;
		}

		entryIndex--;
	}

	if (entryIndex === -1) {
		if (offset > 0) {
			for (;;) {
				entryIndex++;

				if (!isKnown(index.ranges[entryIndex][1])) {
					return entryIndex === 0
						? { key: 0, inclusive, offset }
						: { key: entryIndex - 1, inclusive: true, offset };
				}

				if (isValueEntry(index.ranges[entryIndex][1])) {
					offset--;

					if (offset === 0) {
						return entryIndex;
					}
				}
			}
		}

		return -1;
	}

	if (!isKnown(index.ranges[entryIndex][1])) {
		if (inclusive
			|| !exactEntry
			|| offset <= 0
			|| entryIndex >= index.ranges.length - 1
			|| !isKnown(index.ranges[entryIndex + 1][1])) {
			return {
				key: !inclusive && exactEntry && offset <= 0
					? entryIndex + 1
					: key,
				inclusive,
				offset
			};
		}

		entryIndex++;

		if (isValueEntry(index.ranges[entryIndex][1])) {
			offset--;
		}
	}

	while (offset !== 0) {
		if (offset < 0) {
			do {
				if (entryIndex === 0) {
					return -1;
				}

				if (!isKnown(index.ranges[entryIndex - 1][1])) {
					return { key: entryIndex, inclusive: false, offset: offset + 1 };
				}

				entryIndex--;
			} while (isEmptyEntry(index.ranges[entryIndex][1]));

			offset++;
		} else {
			do {
				if (entryIndex === index.ranges.length - 1 || !isKnown(index.ranges[entryIndex + 1][1])) {
					return { key: entryIndex, inclusive: true, offset };
				}

				entryIndex++;
			} while (isEmptyEntry(index.ranges[entryIndex][1]));

			offset--;
		}
	}

	assert(isValueEntry(index.ranges[entryIndex][1]));

	return entryIndex;
}

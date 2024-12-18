// @ts-check

import assert from 'assert';
import Backend from './backend.js';
import {
	bufferMax, bufferMin, emptyBuffer, strNext
} from './util.js';
import RangeIndex from './RangeIndex.js';
import {
	applyMutations, includesIndependentMutation, isIndependentMutation
} from './range-utils.js';
import resolveCachedKeySelector from './resolveCachedKeySelector.js';

/**
 * @param {import('./types.js').RangeIndexEntry} a
 * @param {import('./types.js').RangeIndexEntry} b
 * @returns {boolean}
 */
function compareIndexEntry(a, b) {
	return a.mutations === b.mutations
		&& a.writeConflict === b.writeConflict
		&& a.readConflict === b.readConflict
		&& a.promise === b.promise
		&& 'value' in a === 'value' in b
		&& a.value === b.value;
}

/**
 * @param {import('./types.js').RangeIndexEntry} a
 * @param {import('./types.js').RangeIndexAction} b
 * @returns {import('./types.js').RangeIndexEntry}
 */
function mergeIndexEntry(a, b) {
	if (b === 'setReadConflict') {
		return {
			...a,
			readConflict: !includesIndependentMutation(a.mutations) || a.readConflict
		};
	}

	if (b === 'setWriteConflict') {
		return {
			...a,
			writeConflict: true
		};
	}

	if (b[0] === 'setPromise') {
		assert(a.promise == null);

		return {
			...a,
			promise: b[1]
		};
	}

	if (b[0] === 'setValue') {
		if (a.value) {
			assert.deepStrictEqual(b[1], a.value);
		}

		return {
			...a,
			promise: undefined,
			value: b[1]
		};
	}

	if (b[0] === 'addMutation') {
		return {
			...a,
			mutations: !Array.isArray(a.mutations) || isIndependentMutation(b[1])
				? [b[1]]
				: [...a.mutations, b[1]]
		};
	}

	return a;
}

/**
 * @param {Buffer} key
 * @param {boolean} inclusive
 * @param {number} offset
 * @param {Transaction} transaction
 * @returns {Promise<[number, Buffer]>}
 */
async function resolveKeySelector(key, inclusive, offset, transaction) {
	const resolvedStartKeySelector = resolveCachedKeySelector(
		{ key, inclusive, offset },
		/** @type {any} */(transaction.index)
	);

	if (typeof resolvedStartKeySelector === 'number') {
		return [resolvedStartKeySelector, transaction.index.ranges[resolvedStartKeySelector][0]];
	}

	const result = await transaction.backend.getKey(key, inclusive, offset);
	const index = transaction.index.ranges.findLastIndex(
		([entryKey]) => Buffer.compare(key, entryKey) >= 0
	);

	return [index, result];
}

/**
 * @param {import('./types.js').KeySelector} start
 * @param {import('./types.js').KeySelector} end
 * @param {boolean} reverse
 * @param {number} limit
 * @param {Transaction} transaction
 * @returns {Promise<[Buffer, Buffer][]>}
 */
async function getAll(start, end, reverse, limit, transaction) {
	const batches = [];

	for (;;) {
		const { results, more } = await transaction.backend.getRange(
			start.key,
			start.inclusive,
			start.offset,
			end.key,
			end.inclusive,
			end.offset,
			reverse,
			limit
		);

		if (results.length) {
			if (!reverse) {
				start = { key: results[results.length - 1][0], inclusive: true, offset: 1 };
			} else {
				end = { key: results[results.length - 1][0], inclusive: false, offset: 1 };
			}
		}

		batches.push(results);

		if (!more) {
			break;
		}

		if (limit) {
			limit -= results.length;

			if (limit <= 0) {
				break;
			}
		}
	}

	return batches.flat();
}

export default class Transaction {
	/**
	 * @type {RangeIndex<
	 *   import('./types.js').RangeIndexEntry,
	 *   import('./types.js').RangeIndexAction
	 * >}
	 */
	index = new RangeIndex(
		{
			mutations: undefined,
			promise: undefined,
			readConflict: false,
			writeConflict: false
		},
		mergeIndexEntry,
		compareIndexEntry
	);

	/** @type {Backend} */
	backend = new Backend();

	blocking = Promise.resolve();

	/**
	 * @param {Buffer} key
	 * @param {boolean} isSnapshot
	 * @returns {Promise<Buffer | undefined>}
	 */
	async get(key, isSnapshot = false) {
		const state = this.index.get(key);

		/** @type {Buffer | undefined} */
		let value;
		const { mutations } = state;

		if (!includesIndependentMutation(mutations)) {
			if (!('value' in state)) {
				let { promise } = state;

				if (state.promise == null) {
					const loadPromise = this.backend.get(key).then(v => {
						this.index.addRange(key, strNext(key), ['setValue', v]);

						return v;
					});

					this.index.addRange(key, strNext(key), ['setPromise', loadPromise]);

					promise = loadPromise;
				}

				value = await promise;
			} else {
				value = state.value;
			}

			if (!isSnapshot) {
				this.index.addRange(key, strNext(key), 'setReadConflict');
			}
		}

		return applyMutations(value, mutations);
	}

	/**
	 * @param {import('./types.js').KeySelector} selector
	 * @param {boolean} isSnapshot
	 * @returns {Promise<Buffer>}
	 */
	async getKey(selector, isSnapshot) {
		const resolvedKeySelector = resolveCachedKeySelector(selector, this.index);

		const result = resolvedKeySelector === undefined || Buffer.isBuffer(resolvedKeySelector)
			? resolvedKeySelector ?? emptyBuffer
			: await this.backend.getKey(
				resolvedKeySelector.key,
				resolvedKeySelector.inclusive,
				resolvedKeySelector.offset
			);

		if (!isSnapshot) {
			if (selector.offset <= 0) {
				this.index.addRange(result, selector.inclusive ? strNext(selector.key) : selector.key, 'setReadConflict');
			} else {
				this.index.addRange(selector.inclusive ? strNext(selector.key) : selector.key, result, 'setReadConflict');
			}
		}

		return result;
	}

	/**
	 * @param {import('./types.js').KeySelector} start
	 * @param {import('./types.js').KeySelector} end
	 * @param {boolean} reverse
	 * @param {number} limit
	 * @param {boolean} isSnapshot
	 * @returns {Promise<import('./backend.js').KVList>}
	 */
	async getRange(
		start,
		end,
		reverse,
		limit,
		isSnapshot
	) {
		const [
			[startIndex, startKey],
			[endIndex, endKey]
		] = await Promise.all([
			resolveKeySelector(start.key, start.inclusive, start.offset, this),
			resolveKeySelector(end.key, end.inclusive, end.offset, this)
		]);

		if (Buffer.compare(startKey, endKey) >= 0) {
			if (!isSnapshot) {
				const startNext = start.inclusive ? strNext(start.key) : start.key;
				const endNext = end.inclusive ? strNext(end.key) : end.key;

				// eslint-disable-next-line no-nested-ternary
				const conflictRange = start.offset <= 0
					? end.offset <= 0
						? [endKey/* min(startKey, endKey) */, bufferMax(startNext, endNext)]
						: [bufferMin(startKey, endNext), startKey/* max(startKey, endKey) */]
					: end.offset <= 0
						? [endKey/* min(startNext, endKey) */, bufferMax(startKey, endNext)]
						: [bufferMin(startNext, endNext), startKey/* max(startKey, endKey) */];

				this.index.addRange(conflictRange[0], conflictRange[1], 'setReadConflict');
			}

			return {
				more: false,
				results: []
			};
		}

		/** @type {Promise<[Buffer, Buffer][]>[]} */
		const entries = [];

		let entryIndex = startIndex;

		if (entryIndex < endIndex) {
			// eslint-disable-next-line no-labels
			out: for (;;) {
				while (this.index.ranges[entryIndex][1].promise) {
					const key = entryIndex === startIndex ? startKey : this.index.ranges[entryIndex][0];

					// @ts-ignore
					entries.push(this.index.ranges[entryIndex][1].promise.then(() => {
						const state = this.index.get(key);

						assert('value' in state);

						return state.value
							? [[key, state.value]]
							: [];
					}));

					entryIndex++;

					if (entryIndex >= endIndex) {
						// eslint-disable-next-line no-labels
						break out;
					}
				}

				const rangeStart = this.index.ranges[entryIndex][0];

				while (!this.index.ranges[entryIndex][1].promise) {
					entryIndex++;

					if (entryIndex >= endIndex) {
						// eslint-disable-next-line no-labels
						break out;
					}
				}

				entries.push(getAll(
					{ key: rangeStart, inclusive: false, offset: 0 },
					{ key: this.index.ranges[entryIndex][0], inclusive: false, offset: 0 },
					false,
					0,
					this
				));
			}
		}

		const results = (await Promise.all(entries)).flat();

		return {
			more: false,
			results
		};
	}

	/**
	 * @param {Buffer} key
	 * @param {Buffer} value
	 */
	set(key, value) {
		this.index.addRange(key, strNext(key), ['addMutation', ['set', value]]);
	}

	/**
	 * @param {Buffer} key
	 */
	clear(key) {
		this.index.addRange(key, strNext(key), ['addMutation', 'clear']);
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 */
	clearRange(start, end) {
		this.index.addRange(start, end, ['addMutation', 'clear']);
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 */
	addWriteConflictRange(start, end) {
		this.index.addRange(start, end, 'setWriteConflict');
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 */
	addReadConflictRange(start, end) {
		this.index.addRange(start, end, 'setReadConflict');
	}
}

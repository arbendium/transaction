// @ts-check

import assert from 'assert';
import Backend from './backend.js';
import {
	bufferMin, emptyBuffer, keyspaceEnd, strNext
} from './util.js';
import RangeIndex from './RangeIndex.js';

/**
 * @typedef {'set'} MutationType
 * @typedef {'unknown' | 'empty' | 'value'} State
 * @typedef {[MutationType, Buffer] | 'clear'} Mutation
 * @typedef {{ key: Buffer, inclusive: boolean, offset: number }} KeySelector
 * @typedef {{
 *   entry: {} | undefined,
 *   promise: Promise<Buffer | undefined> | undefined
 *   value?: Buffer | undefined
 *   readConflict: boolean
 *   writeConflict: boolean
 *   mutations: Mutation[] | undefined
 * }} RangeIndexEntry
 * @typedef {(
 *   | ['setPromise', Promise<Buffer | undefined>]
 *   | ['setEntryValue', Buffer | undefined]
 *   | 'setReadConflict'
 *   | 'setWriteConflict'
 *   | ['addMutation', Mutation]
 * )} RangeIndexAction
 */

/**
 * @param {Buffer | undefined} value
 * @param {Mutation} mutation
 */
function applyMutation(value, mutation) {
	if (mutation === 'clear') {
		return undefined;
	}

	if (mutation[0] === 'set') {
		return mutation[1];
	}

	return value;
}

/**
 * @param {RangeIndexEntry} a
 * @param {RangeIndexEntry} b
 * @returns {boolean}
 */
function compareIndexEntry(a, b) {
	return a.entry === b.entry
		&& a.mutations === b.mutations
		&& a.writeConflict === b.writeConflict
		&& a.readConflict === b.readConflict
		&& a.promise === b.promise
		&& 'value' in a === 'value' in b
		&& a.value === b.value;
}

/**
 * @param {RangeIndexEntry} a
 * @param {RangeIndexAction} b
 * @returns {RangeIndexEntry}
 */
function mergeIndexEntry(a, b) {
	if (b === 'setReadConflict') {
		return {
			...a,
			readConflict: !a.mutations || a.readConflict
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

	if (b[0] === 'setEntryValue') {
		if ('value' in a) {
			assert.deepStrictEqual(b[1], a.value);
		}

		return {
			...a,
			promise: undefined,
			entry: b[1] !== undefined ? a.entry ?? {} : undefined,
			value: b[1]
		};
	}

	if (b[0] === 'addMutation') {
		return {
			...a,
			entry: b[1] !== 'clear' ? a.entry ?? {} : undefined,
			mutations: b[1] === 'clear' || b[1][0] === 'set' || !Array.isArray(a.mutations)
				? [b[1]]
				: [...a.mutations, b[1]]
		};
	}

	return a;
}

/**
 * @param {Buffer} start
 * @param {boolean} startInclusive
 * @param {number} startOffset
 * @param {Buffer} end
 * @param {boolean} endInclusive
 * @param {number} endOffset
 * @param {import('./backend.js').KVList} result
 */
function getRangeConflictRange(
	start,
	startInclusive,
	startOffset,
	end,
	endInclusive,
	endOffset,
	result
) {
	/** @type {Buffer} */
	let rangeBegin;
	/** @type {Buffer} */
	let rangeEnd;

	if (Buffer.compare(start, end) < 0) {
		rangeBegin = start;
		rangeEnd = endOffset > 0 && result.more ? start : end;
	} else {
		rangeBegin = end;
		rangeEnd = start;
	}

	if (result.readToBegin && startOffset <= 0) {
		rangeBegin = Buffer.from([]);
	}

	if (result.readThroughEnd && endOffset > 0) {
		rangeEnd = Buffer.from([0xff]);
	}

	if (result.results.length) {
		if (startOffset <= 0) {
			rangeBegin = bufferMin(rangeBegin, result.results[0][0]);
		}

		const lastEntryKey = result.results[result.results.length - 1][0];

		if (Buffer.compare(rangeEnd, lastEntryKey) <= 0) {
			rangeEnd = strNext(result.results[result.results.length - 1][0]);
		}
	}

	return [rangeBegin, rangeEnd];
}

/**
 * @param {Buffer} key
 * @param {boolean} inclusive
 * @param {number} offset
 * @param {RangeIndex<RangeIndexEntry, RangeIndexAction>} index
 * @returns {KeySelector | number}
 */
function resolveCachedKeySelector(key, inclusive, offset, index) {
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

/**
 * @param {Buffer} start
 * @param {Buffer} end
 * @param {boolean} reverse
 * @param {number | undefined} limit
 * @returns {Promise<[Buffer, Buffer][]>}
 */
async function readRange(start, end, reverse, limit) {
	return [];
}

export default class Transaction {
	/** @type {RangeIndex<RangeIndexEntry, RangeIndexAction>} */
	index = new RangeIndex(
		{
			entry: undefined,
			promise: undefined,
			readConflict: false,
			writeConflict: false,
			mutations: undefined
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

		if (!mutations || (mutations[0] !== 'clear' && mutations[0][0] !== 'set')) {
			if (!('value' in state)) {
				let { promise } = state;

				if (state.promise == null) {
					const loadPromise = this.backend.get(key).then(v => {
						this.index.addRange(key, strNext(key), ['setEntryValue', v]);

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

		if (mutations) {
			for (let i = 0; i < mutations.length; i++) {
				value = applyMutation(value, mutations[i]);
			}
		}

		return value;
	}

	/**
	 * @param {Buffer} key
	 * @param {boolean} [inclusive]
	 * @param {number} [offset]
	 * @param {boolean} [isSnapshot]
	 * @returns {Promise<Buffer>}
	 */
	async getKey(key, inclusive = false, offset = 1, isSnapshot = false) {
		const resolvedKeySelector = resolveCachedKeySelector(key, inclusive, offset, this.index);

		if (typeof resolvedKeySelector === 'number') {
			return this.index.ranges[resolvedKeySelector][0];
		}

		const result = await this.backend.getKey(key, inclusive, offset);

		if (!isSnapshot) {
			if (offset <= 0) {
				this.index.addRange(result, inclusive ? strNext(key) : key, 'setReadConflict');
			} else {
				this.index.addRange(inclusive ? strNext(key) : key, result, 'setReadConflict');
			}
		}

		return result;
	}

	/**
	 * @param {Buffer} start
	 * @param {boolean | undefined} startInclusive
	 * @param {number | undefined} startOffset
	 * @param {Buffer} end
	 * @param {boolean} endInclusive
	 * @param {number} endOffset
	 * @param {boolean} reverse
	 * @param {number} limit
	 * @param {boolean} isSnapshot
	 * @returns {Promise<import('./backend.js').KVList>}
	 */
	async getRange(
		start,
		startInclusive,
		startOffset,
		end,
		endInclusive,
		endOffset,
		reverse,
		limit,
		isSnapshot
	) {
		const startKey = await this.getKey(start, startInclusive, startOffset, isSnapshot);
		const endKey = await this.getKey(end, endInclusive, endOffset, isSnapshot);

		if (Buffer.compare(startKey, endKey) >= 0) {
			return {
				more: false,
				results: []
			};
		}

		const startIndex = this.index.findIndex(([key]) => Buffer.compare(key, startKey) <= 0);
		const endIndex = this.index.findIndex(([key]) => Buffer.compare(key, startKey) <= 0);

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

				entries.push(readRange(
					rangeStart,
					this.index.ranges[entryIndex][0],
					false,
					undefined
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

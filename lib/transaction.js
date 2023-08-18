// @ts-check

import assert from 'assert';
import Backend from './backend.js';
import {
	bufferMin, emptyBuffer, ffBuffer, keyspaceEnd, strNext
} from './util.js';
import RangeIndex from './RangeIndex.js';

/**
 * @template T
 * @typedef {Promise<T> & { value?: T }} PromiseWithValue
 */
/**
 * @typedef {'set'} MutationType
 * @typedef {'unknown' | 'empty' | 'value'} State
 * @typedef {[MutationType, Buffer] | 'clear'} Mutation
 * @typedef {{ key: Buffer, inclusive: boolean, offset: number }} KeySelector
 * @typedef {{
 *   entry: {} | undefined,
 *   promise: PromiseWithValue<Buffer | undefined> | undefined,
 *   readConflict: boolean
 *   writeConflict: boolean
 *   mutations: Mutation[] | undefined
 * }} RangeIndexEntry
 * @typedef {(
 *   | ['setKnownValue', PromiseWithValue<Buffer | undefined>]
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
		&& a.writeConflict === b.writeConflict
		&& a.readConflict === b.readConflict
		&& a.promise === b.promise
		&& a.mutations === b.mutations;
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

	if (b[0] === 'setKnownValue') {
		return {
			...a,
			entry: a.entry ?? {},
			promise: b[1]
		};
	}

	if (b[0] === 'addMutation') {
		return {
			...a,
			entry: a.entry ?? {},
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
	let keyIndex = index.ranges.findIndex(
		inclusive
			? ([entryKey]) => Buffer.compare(key, entryKey) >= 0
			: ([entryKey]) => Buffer.compare(key, entryKey) > 0
	);

	for (;;) {
		const currentEntry = index.ranges[keyIndex];

		if (currentEntry[1].entry == null) {
			return { key: currentEntry[0], inclusive, offset };
		}

		if (offset === 0) {
			return keyIndex;
		}

		if (offset < 0) {
			const previousEntry = index.ranges[keyIndex - 1];

			if (!previousEntry) {
				return { key: emptyBuffer, inclusive: true, offset: 0 };
			}

			if (previousEntry[1].entry == null) {
				return { key: currentEntry[0], inclusive: true, offset };
			}

			keyIndex--;
			offset++;
		} else {
			const nextEntry = index.ranges[keyIndex + 1];

			// TODO: check that it's inside the keyspace
			if (!nextEntry) {
				return { key: keyspaceEnd(key), inclusive: false, offset: 1 };
			}

			if (nextEntry[1].entry == null) {
				return { key: nextEntry[0], inclusive: true, offset };
			}

			keyIndex++;
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
		let { mutations } = state;

		if (!mutations || (mutations[0] !== 'clear' && mutations[0][0] !== 'set')) {
			let { promise } = state;

			if (!promise) {
				promise = this.backend.get(key).then(v => {
					// @ts-ignore
					promise.value = v;

					return v;
				});

				this.index.addRange(key, strNext(key), ['setKnownValue', promise]);
			}

			if (!('value' in promise)) {
				await promise;

				const newState = this.index.get(key);

				assert(newState.promise && 'value' in newState.promise);

				mutations = newState.mutations;
				value = newState.promise.value;
			} else {
				value = promise.value;
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
		const range = offset <= 0
			? await this.getRange(emptyBuffer, false, 1, key, inclusive, offset + 1, true, 1, isSnapshot)
			: await this.getRange(key, inclusive, offset, ffBuffer, false, 1, false, 1, isSnapshot);

		assert.strictEqual(range.more, false);

		if (range.results.length === 0) {
			return offset <= 0 ? emptyBuffer : ffBuffer;
		}

		return range.results[0][0];
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
		if (limit === 0) {
			return {
				more: false,
				results: []
			};
		}

		/** @type {Promise<[Buffer, Buffer][]>[]} */
		const entries = [];

		let knownEntries = 0;
		let entryIndex = 0;

		// eslint-disable-next-line no-labels
		out: for (;;) {
			while (this.index.ranges[entryIndex][1].promise) {
				const key = this.index.ranges[entryIndex][0];

				entries.push(
					Promise.resolve(this.index.ranges[entryIndex][1].promise).then(
						result => result != null ? [[key, result]] : []
					)
				);

				knownEntries++;
				entryIndex++;

				if (limit != null && knownEntries >= limit) {
					// eslint-disable-next-line no-labels
					break out;
				}
			}

			const rangeStart = entryIndex;

			while (!this.index.ranges[entryIndex][1].promise) {
				entryIndex++;

				if (entryIndex >= this.index.ranges.length) {
					const lastEntryKey = this.index.ranges[rangeStart][0];

					entries.push(readRange(
						lastEntryKey,
						keyspaceEnd(lastEntryKey),
						false,
						limit != null ? limit - knownEntries : undefined
					));

					// eslint-disable-next-line no-labels
					break out;
				}
			}

			entries.push(readRange(
				this.index.ranges[rangeStart][0],
				this.index.ranges[entryIndex][0],
				false,
				limit != null ? limit - knownEntries : undefined
			));
		}

		const results = (await Promise.all(entries)).flat();

		if (limit != null) {
			results.length = limit;
		}

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

// @ts-check

import assert from 'assert';
import Backend from './backend.js';
import {
	bufferMax, bufferMin, emptyBuffer, strNext
} from './util.js';
import RangeIndex from './RangeIndex.js';

const emptyValue = Symbol('empty value');

/**
 * @typedef {Buffer | typeof emptyValue} Value
 * @typedef {'set'} MutationType
 * @typedef {[MutationType, Buffer] | 'clear'} Mutation
 * @typedef {{ key: Buffer, inclusive: boolean, offset: number }} KeySelector
 * @typedef {{
 *   mutations: Mutation[] | undefined
 *   promise: Promise<Value> | undefined
 *   readConflict: boolean
 *   value?: Value | undefined
 *   writeConflict: boolean
 * }} RangeIndexEntry
 * @typedef {(
 *   | ['setPromise', Promise<Value>]
 *   | ['setValue', Value]
 *   | 'setReadConflict'
 *   | 'setWriteConflict'
 *   | ['addMutation', Mutation]
 * )} RangeIndexAction
 */

/**
 * @overload
 * @param {Value} value
 * @param {Mutation} mutation
 * @returns {Value}
 */
/**
 * @overload
 * @param {Value | undefined} value
 * @param {Mutation} mutation
 * @returns {Value | undefined}
 */
/**
 * @param {Value | undefined} value
 * @param {Mutation} mutation
 * @returns {Value | undefined}
 */
function applyMutation(value, mutation) {
	if (mutation === 'clear') {
		return emptyValue;
	}

	if (mutation[0] === 'set') {
		return mutation[1];
	}

	return value ?? emptyBuffer;
}

/**
 * @overload
 * @param {Value} value
 * @param {Mutation[] | undefined} mutations
 * @returns {Value}
 */
/**
 * @overload
 * @param {Value | undefined} value
 * @param {Mutation[] | undefined} mutations
 * @returns {Value | undefined}
 */
/**
 * @param {Value | undefined} value
 * @param {Mutation[] | undefined} mutations
 * @returns {Value | undefined}
 */
function applyMutations(value, mutations) {
	return mutations != null
		? mutations.reduce(applyMutation, value)
		: value;
}

/**
 * @param {Mutation} mutation
 * @returns {boolean}
 */
function isIndependentMutation(mutation) {
	return mutation === 'clear' || mutation[0] === 'set';
}

/**
 * @param {Mutation[] | undefined} mutations
 * @returns {boolean}
 */
function includesIndependentMutation(mutations) {
	return mutations != null && mutations.some(isIndependentMutation);
}

/**
 * @param {Pick<RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isEmptyEntry(entry) {
	return isKnown(entry) && applyMutations(entry.value, entry.mutations) === undefined;
}

/**
 * @param {Pick<RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isValueEntry(entry) {
	return isKnown(entry) && applyMutations(entry.value, entry.mutations) !== undefined;
}

/**
 * @param {Pick<RangeIndexEntry, 'value' | 'mutations'>} entry
 */
function isKnown(entry) {
	return 'value' in entry || includesIndependentMutation(entry.mutations);
}

/**
 * @param {RangeIndexEntry} a
 * @param {RangeIndexEntry} b
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
 * @param {RangeIndexEntry} a
 * @param {RangeIndexAction} b
 * @returns {RangeIndexEntry}
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
 * @returns {KeySelector | Buffer | undefined}
 */
function resolveCachedKeySelector(key, inclusive, offset, index) {
	let entryIndex = index.ranges.findIndex(
		inclusive
			? ([entryKey]) => Buffer.compare(key, entryKey) >= 0
			: ([entryKey]) => Buffer.compare(key, entryKey) > 0
	);

	if (offset <= 0) {
	if (entryIndex < 0) {
		return undefined; // TODO: count forward if necessary
	}

	if (!isKnown(index.ranges[entryIndex][1])) {
		return { key, inclusive, offset };
	}

	if (!isEmptyEntry(index.ranges[entryIndex][1])) {
		if (entryIndex === 0) {

		}

		entryIndex--;
	}

	for (;;) {
		if (entryIndex < 0) {
			return undefined; // TODO: count forward if necessary
		}

		if (!isKnownEntry(index.ranges[entryIndex][1])) {

		}

		if (isEmptyEntry(index.ranges[entryIndex][1])) {
			entryIndex--;
		} else if (entryIndex === 0) {

		}

		if (entryIndex > 0 && !isKnown(index.ranges[entryIndex - 1][1])) {
			return { key, inclusive, offset };
		}

		entryIndex--;
	}

	for (;;) {
		const currentEntry = index.ranges[entryIndex];

		if (!isKnown(currentEntry[1])) {
			return { key: currentEntry[0], inclusive, offset };
		}

		if (offset === 0) {
			return currentEntry[0];
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
				return undefined;
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
 * @param {Buffer} key
 * @param {boolean} inclusive
 * @param {number} offset
 * @param {Transaction} transaction
 * @returns {Promise<[number, Buffer]>}
 */
async function resolveKeySelector(key, inclusive, offset, transaction) {
	const resolvedStartKeySelector = resolveCachedKeySelector(
		key,
		inclusive,
		offset,
		transaction.index
	);

	if (typeof resolvedStartKeySelector === 'number') {
		return [resolvedStartKeySelector, transaction.index.ranges[resolvedStartKeySelector][0]];
	}

	const result = await transaction.backend.getKey(key, inclusive, offset);
	const index = transaction.index.findIndex(([entryKey]) => Buffer.compare(entryKey, key) <= 0);

	return [index, result];
}

/**
 * @param {KeySelector} start
 * @param {KeySelector} end
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
	/** @type {RangeIndex<RangeIndexEntry, RangeIndexAction>} */
	index = new RangeIndex(
		{
			entry: undefined,
			known: false,
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

		if (mutations) {
			for (let i = 0; i < mutations.length; i++) {
				value = applyMutation(value, mutations[i]);
			}
		}

		return value;
	}

	/**
	 * @param {Buffer} key
	 * @param {boolean} inclusive
	 * @param {number} offset
	 * @param {boolean} isSnapshot
	 * @returns {Promise<Buffer>}
	 */
	async getKey(key, inclusive, offset, isSnapshot) {
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
	 * @param {boolean} startInclusive
	 * @param {number} startOffset
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
		const [
			[startIndex, startKey],
			[endIndex, endKey]
		] = await Promise.all([
			resolveKeySelector(start, startInclusive, startOffset, this),
			resolveKeySelector(end, endInclusive, endOffset, this)
		]);

		if (Buffer.compare(startKey, endKey) >= 0) {
			if (!isSnapshot) {
				const startNext = startInclusive ? strNext(start) : start;
				const endNext = endInclusive ? strNext(end) : end;

				// eslint-disable-next-line no-nested-ternary
				const conflictRange = startOffset <= 0
					? endOffset <= 0
						? [endKey/* min(startKey, endKey) */, bufferMax(startNext, endNext)]
						: [bufferMin(startKey, endNext), startKey/* max(startKey, endKey) */]
					: endOffset <= 0
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

		if (!isSnapshot) {
			const start = offset;
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

/* eslint-disable no-empty-function */
/* eslint-disable class-methods-use-this */
import * as fdb from '@arbendium/foundationdb';
import { emptyBuffer, strNext } from './util.js';

/**
 * @typedef {number} Version
 * @typedef {['clear', Buffer] | ['clear', Buffer, Buffer] | ['set', Buffer, Buffer]} Mutation
 */

/**
 * @param {[Buffer, Buffer][]} entries
 * @param {Mutation[]} mutations
 * @returns
 */
function applyMutations(entries, mutations) {
	for (const mutation of mutations) {
		switch (mutation[0]) {
		case 'clear':
			entries = entries.filter(
				mutation.length === 2
					? ([baseEntryKey]) => Buffer.compare(baseEntryKey, mutation[1]) !== 0
					: ([baseEntryKey]) => Buffer.compare(baseEntryKey, mutation[1]) < 0
					|| Buffer.compare(baseEntryKey, mutation[2]) >= 0
			);

			break;

		case 'set':
			for (let i = 0; ; i++) {
				if (i === entries.length) {
					entries.push([mutation[1], mutation[2]]);

					break;
				}

				const cmp = Buffer.compare(entries[i][0], mutation[1]);

				if (cmp === 0) {
					entries.splice(i, 1, [mutation[1], mutation[2]]);

					break;
				}

				if (cmp < 0) {
					entries.splice(i, 0, [mutation[1], mutation[2]]);

					break;
				}
			}

			break;
		}
	}

	return entries;
}

class NativeDatabase {
	/** @type {[Buffer, Buffer][]} */
	entries;

	/** @type {[Version, Mutation[]][]} */
	log;

	/** @type {Version} */
	latestVersion;

	constructor() {
		this.entries = [];
		this.log = [];
		this.latestVersion = 1;
	}

	/**
	 * @returns {NativeTransaction}
	 */
	createTransaction() {
		const that = this;
		const version = this.latestVersion;
		/** @type {[Buffer, Buffer][]} */
		const readConflictRanges = [];
		/** @type {[Buffer, Buffer][]} */
		const writeConflictRanges = [];
		/** @type {Mutation[]} */
		const mutations = [];

		function getEntries() {
			return applyMutations(
				that.entries,
				that.log
					.filter(([logVersion]) => logVersion <= version)
					.flatMap(([, mutation]) => mutation)
					.concat(mutations)
			);
		}

		/**
		 * @param {Buffer} key
		 * @param {boolean} inclusive
		 * @param {number} offset
		 * @param {boolean} addConflict
		 * @returns {Buffer}
		 */
		function getKey(key, inclusive, offset, addConflict) {
			if (key.length > 1 && key[0] === 0xff) {
				throw new Error('Key outside legal range');
			}

			const entries = getEntries();

			let index = entries.findLastIndex(
				inclusive
					? ([entryKey]) => Buffer.compare(entryKey, key) <= 0
					: ([entryKey]) => Buffer.compare(entryKey, key) < 0
			);

			index += offset;

			/** @type {Buffer} */
			let result;

			if (index <= 0) {
				result = emptyBuffer;
			} else if (index >= entries.length) {
				result = Buffer.from([0xff]);
			} else {
				[result] = entries[index];
			}

			if (addConflict) {
				if (offset <= 0) {
					readConflictRanges.push([result, inclusive ? strNext(key) : key]);
				} else {
					readConflictRanges.push([inclusive ? strNext(key) : key, result]);
				}
			}

			return result;
		}

		return new NativeTransaction({
			async get(key, addConflict) {
				if (addConflict) {
					readConflictRanges.push([key, strNext(key)]);
				}

				return getEntries().find(([entryKey]) => Buffer.compare(entryKey, key) === 0)?.[0];
			},
			async getRange(
				start,
				startInclusive,
				startOffset,
				end,
				endInclusive,
				endOffset,
				limit,
				reverse,
				addConflict
			) {
				const [resolvedStart, resolvedEnd] = [
					getKey(start, startInclusive, startOffset, addConflict),
					getKey(end, endInclusive, endOffset, addConflict)
				];

				if (addConflict) {
					readConflictRanges.push([resolvedStart, resolvedEnd]);
				}

				return getEntries().filter(
					([baseEntryKey]) => Buffer.compare(baseEntryKey, resolvedStart) >= 0
						&& Buffer.compare(baseEntryKey, resolvedEnd) < 0
				);
			},
			async getKey(key, inclusive, offset, addConflict) {
				return getKey(key, inclusive, offset, addConflict);
			},
			clear(key, addConflict) {
				mutations.push(['clear', key]);

				if (addConflict) {
					writeConflictRanges.push([key, strNext(key)]);
				}
			},
			clearRange(start, end, addConflict) {
				mutations.push(['clear', start, end]);

				if (addConflict) {
					writeConflictRanges.push([start, end]);
				}
			},
			set(key, value, addConflict) {
				mutations.push(['set', key, value]);

				if (addConflict) {
					writeConflictRanges.push([key, strNext(key)]);
				}
			},
			addReadConflictRange(start, end) {
				readConflictRanges.push([start, end]);
			},
			addWriteConflictRange(start, end) {
				writeConflictRanges.push([start, end]);
			}
		});
	}

	setOption() {}

	close() {}
}

class NativeTransaction {
	/** @type {import('./types.js').Backend} */
	_backend;

	/**
	 * @param {import('./types.js').Backend} backend
	 */
	constructor(backend) {
		this._backend = backend;
	}

	/**
	 * @param {unknown} code
	 * @param {unknown} param
	 */
	setOption(code, param) {}

	async commit() {}

	reset() {}

	cancel() {}

	/**
	 * @param {number} code
	 */
	async onError(code) {
		console.log('Error', code);
	}

	getApproximateSize() { return Promise.resolve(0); }

	/**
	 * @param {Buffer} key
	 * @param {boolean} isSnapshot
	 * @returns
	 */
	async get(key, isSnapshot) {
		return this._backend.get(key, !isSnapshot);
	}

	/**
	 * @param {Buffer} key
	 * @param {boolean} inclusive
	 * @param {number} offset
	 * @param {boolean} isSnapshot
	 */
	async getKey(key, inclusive, offset, isSnapshot) {
		return this._backend.getKey(key, inclusive, offset, !isSnapshot);
	}

	/**
	 * @param {Buffer} key
	 * @param {Buffer} value
	 */
	set(key, value) {
		return this._backend.set(key, value, true);
	}

	/**
	 * @param {Buffer} key
	 */
	clear(key) {
		this._backend.clear(key, true);
	}

	atomicOp(opType, key, operand) {}

	/**
	 * @param {Buffer} start
	 * @param {boolean} startInclusive
	 * @param {number} startOffset
	 * @param {Buffer} end
	 * @param {boolean} endInclusive
	 * @param {number} endOffset
	 * @param {number} limit
	 * @param {unknown} targetBytes
	 * @param {unknown} mode
	 * @param {number} iter
	 * @param {boolean} isSnapshot
	 * @param {boolean} reverse
	 */
	async getRange(
		start,
		startInclusive,
		startOffset,
		end,
		endInclusive,
		endOffset,
		limit,
		targetBytes,
		mode,
		iter,
		isSnapshot,
		reverse
	) {
		return {
			more: false,
			results: iter === 0
				? await this._backend.getRange(
					start,
					startInclusive,
					startOffset,
					end,
					endInclusive,
					endOffset,
					limit,
					reverse,
					!isSnapshot
				)
				: []
		};
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 */
	clearRange(start, end) {
		this._backend.clearRange(start, end, true);
	}

	async getEstimatedRangeSizeBytes(start, end) { return 0; }

	async getRangeSplitPoints(start, end, chunkSize) {
		return [];
	}

	watch(key, ignoreStandardErrs) {
		return /** @type {any} */(undefined);
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 */
	addReadConflictRange(start, end) {
		this._backend.addReadConflictRange(start, end);
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 */
	addWriteConflictRange(start, end) {
		this._backend.addReadConflictRange(start, end);
	}

	setReadVersion(v) {}

	async getReadVersion() {
		return Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
	}

	getCommittedVersion() {
		return Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
	}

	async getVersionstamp() {
		return Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
	}

	/**
	 * @param {Buffer} key
	 */
	async getAddressesForKey(key) {
		return [];
	}
}

const database = new fdb.Database(new NativeDatabase(), fdb.root);

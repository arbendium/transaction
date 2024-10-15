// @ts-check

import assert from 'node:assert';
import test from 'node:test';
import RangeIndex from '../lib/RangeIndex.js';
import { resolveCachedKeySelector } from '../lib/range-utils.js';
import { emptyBuffer } from '../lib/util.js';

/** @type {import('../lib/types.ts').RangeIndexEntry} */
const defaultEntry = {
	mutations: undefined,
	promise: undefined,
	readConflict: false,
	writeConflict: false
};

/**
 * @param {[number[], boolean | undefined][]} values
 * @returns {RangeIndex<
 *   import('../lib/types.ts').RangeIndexEntry,
 *   import('../lib/types.ts').RangeIndexEntry
 * >}
 */
function createIndex(values) {
	/**
	 * @type {RangeIndex<
	 *   import('../lib/types.ts').RangeIndexEntry,
	 *   any
	 * >}
	 */
	const index = new RangeIndex(
		/** @type {any} */(undefined),
		/** @type {any} */(undefined),
		/** @type {any} */(undefined)
	);

	index.ranges = values.map(([key, value]) => [
		Buffer.from(key),
		{
			...defaultEntry,
			...value != null ? { value: value ? emptyBuffer : undefined } : undefined
		}
	]);

	return index;
}

/**
 * @param {[number[], boolean | undefined][]} state
 * @param {number[]} key
 * @param {{
 *   false?: Record<
 *     number,
 *     { key: number[], inclusive: boolean, offset: number } | number[] | undefined
 *   >
 *   true?: Record<
 *     number,
 *     { key: number[], inclusive: boolean, offset: number } | number[] | undefined
 *   >
 * }} expectResult
 */
async function genericTest(state, key, expectResult) {
	const keyBuffer = Buffer.from(key);

	for (const inclusive of [true, false]) {
		const expectResults = expectResult[`${inclusive}`];

		if (expectResults != null) {
			for (const [offset, value] of Object.entries(expectResults)) {
				await test(`inclusive:${inclusive} offset:${offset}`, () => {
					const index = createIndex(state);

					const result = resolveCachedKeySelector(
						keyBuffer,
						inclusive,
						+offset,
						index
					);

					assert.deepStrictEqual(
						result,
						// eslint-disable-next-line no-nested-ternary
						Array.isArray(value)
							? Buffer.from(value)
							: value != null
								? { key: Buffer.from(value.key), inclusive: value.inclusive, offset: value.offset }
								: value
					);
				});
			}
		}
	}
}

test('key: - empty index', async () => {
	await genericTest(
		[[[], undefined]],
		[],
		{
			false: {
				'-2': undefined,
				'-1': undefined,
				0: undefined,
				1: { key: [], inclusive: false, offset: 1 },
				2: { key: [], inclusive: false, offset: 2 }
			},
			true: {
				'-2': undefined,
				'-1': undefined,
				0: { key: [], inclusive: true, offset: 0 },
				1: { key: [], inclusive: true, offset: 1 },
				2: { key: [], inclusive: true, offset: 2 }
			}
		}
	);
});

test('key: - [] being undefined', async () => {
	await genericTest(
		[[[], false], [[0], undefined]],
		[],
		{
			false: {
				'-2': undefined,
				'-1': undefined,
				0: undefined,
				1: { key: [], inclusive: true, offset: 1 },
				2: { key: [], inclusive: true, offset: 2 }
			},
			true: {
				'-2': undefined,
				'-1': undefined,
				0: undefined,
				1: { key: [], inclusive: true, offset: 1 },
				2: { key: [], inclusive: true, offset: 2 }
			}
		}
	);
});

test('key: - [] being a value', async () => {
	await genericTest(
		[[[], true], [[0], undefined]],
		[],
		{
			false: {
				'-2': undefined,
				'-1': undefined,
				0: undefined,
				1: [],
				2: { key: [], inclusive: true, offset: 1 }
			},
			true: {
				'-2': undefined,
				'-1': undefined,
				0: [],
				1: { key: [], inclusive: true, offset: 1 },
				2: { key: [], inclusive: true, offset: 2 }
			}
		}
	);
});

test('key:0 - empty index', async () => {
	await genericTest(
		[[[], undefined]],
		[0],
		{
			false: {
				'-2': { key: [0], inclusive: false, offset: -2 },
				'-1': { key: [0], inclusive: false, offset: -1 },
				0: { key: [0], inclusive: false, offset: 0 },
				1: { key: [0], inclusive: false, offset: 1 },
				2: { key: [0], inclusive: false, offset: 2 }
			},
			true: {
				'-2': { key: [0], inclusive: true, offset: -2 },
				'-1': { key: [0], inclusive: true, offset: -1 },
				0: { key: [0], inclusive: true, offset: 0 },
				1: { key: [0], inclusive: true, offset: 1 },
				2: { key: [0], inclusive: true, offset: 2 }
			}
		}
	);
});

test('key:0 - [] being undefined', async () => {
	await genericTest(
		[[[], false], [[0], undefined]],
		[0],
		{
			false: {
				'-2': undefined,
				'-1': undefined,
				0: undefined,
				1: { key: [], inclusive: true, offset: 1 },
				2: { key: [], inclusive: true, offset: 2 }
			},
			true: {
				'-2': { key: [0], inclusive: true, offset: -2 },
				'-1': { key: [0], inclusive: true, offset: -1 },
				0: { key: [0], inclusive: true, offset: 0 },
				1: { key: [0], inclusive: true, offset: 1 },
				2: { key: [0], inclusive: true, offset: 2 }
			}
		}
	);
});

test('key:0 - [] being a value', async () => {
	await genericTest(
		[[[], true], [[0], undefined]],
		[0],
		{
			false: {
				'-2': undefined,
				'-1': undefined,
				0: [],
				1: { key: [], inclusive: true, offset: 1 },
				2: { key: [], inclusive: true, offset: 2 }
			},
			true: {
				'-2': { key: [0], inclusive: true, offset: -2 },
				'-1': { key: [0], inclusive: true, offset: -1 },
				0: { key: [0], inclusive: true, offset: 0 },
				1: { key: [0], inclusive: true, offset: 1 },
				2: { key: [0], inclusive: true, offset: 2 }
			}
		}
	);
});

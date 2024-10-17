// @ts-check

import assert from 'node:assert';
import test, { suite } from 'node:test';
import RangeIndex from '../lib/RangeIndex.js';
import { resolveCachedKeySelector } from '../lib/range-utils.js';
import { emptyBuffer } from '../lib/util.js';

/**
 * @typedef {(
 *   | { key: number[], inclusive: boolean, offset: number }
 *   | number[]
 *   | undefined
 * )} SimpleResult
 */

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
 *   false?: Record<number, SimpleResult>
 *   true?: Record<number, SimpleResult>
 * }} expectResult
 */
function genericTest(state, key, expectResult) {
	const keyBuffer = Buffer.from(key);

	for (const inclusive of [true, false]) {
		const expectResults = expectResult[`${inclusive}`];

		if (expectResults != null) {
			for (const [offset, value] of Object.entries(expectResults)) {
				test(`inclusive:${inclusive} offset:${offset}`, () => {
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

/**
 * @param {number[]} key
 * @param {Record<string, { false?: SimpleResult[], true?: SimpleResult[] }>} expectResults
 */
function matrixTest(key, expectResults) {
	for (const [state, expectResult] of Object.entries(expectResults)) {
		assert.strictEqual(state.length, 4);
		assert('UTF'.includes(state[0]));
		assert('MUTF'.includes(state[1]));
		assert('MUTF'.includes(state[2]));
		assert('MUTF'.includes(state[3]));

		/** @type {[number[], boolean | undefined][]} */
		const ranges = [];

		/** @type {Record<string, boolean | undefined>} */
		const map = { T: true, F: false, U: undefined };

		ranges.push([[], map[state[0]]]);

		if (state[1] !== 'M') {
			ranges.push([[0], map[state[1]]]);
		}

		if (state[2] !== 'M') {
			ranges.push([[1], map[state[2]]]);
		}

		if (state[3] !== 'M') {
			ranges.push([[2], map[state[3]]]);
		}

		const normalizedExpectResult = Object.fromEntries(Object.entries(expectResult).map(
			([key, value]) => {
				const offsetRange = Math.floor(value.length / 2);

				return [key, Object.fromEntries(value.map((v, i) => [i - offsetRange, v]))];
			}
		));

		suite(state, () => {
			genericTest(ranges, key, normalizedExpectResult);
		});
	}
}

suite.skip('key: - empty index', () => {
	genericTest(
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

suite.skip('key: - [] being undefined', () => {
	genericTest(
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

suite.skip('key: - [] being a value', () => {
	genericTest(
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

suite.skip('key:0 - empty index', () => {
	genericTest(
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

suite.skip('key:0 - [] being undefined', () => {
	genericTest(
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

suite.skip('key:0 - [] being a value', () => {
	genericTest(
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

suite('matrix:', () => {
	matrixTest(
		[],
		{
			UMMM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUMM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FUMM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUMM: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UMUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FMUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMUM: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FUUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUUM: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FFUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFUM: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FTUM: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			TTUM: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					[0]
				],
				true: [
					undefined,
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			UMMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FMMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMMU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FUMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUMU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FFMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFMU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FTMU: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			TTMU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					[0]
				],
				true: [
					undefined,
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			UMUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FMUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMUU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FUUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUUU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FFUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFUU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FTUU: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			TTUU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					[0]
				],
				true: [
					undefined,
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			UMFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FMFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TMFU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FUFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUFU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FFFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TFFU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FTFU: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TTFU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					[0]
				],
				true: [
					undefined,
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			UMTU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FMTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TMTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					[1]
				],
				true: [
					undefined,
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			UUTU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FUTU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFTU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FFTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TFTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					[1]
				],
				true: [
					undefined,
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			UTTU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: false, offset: 1 },
					{ key: [], inclusive: false, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 0 },
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			FTTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					[1]
				],
				true: [
					undefined,
					undefined,
					undefined,
					[0],
					[1]
				]
			},
			TTTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[],
					[0]
				],
				true: [
					undefined,
					undefined,
					[],
					[0],
					[1]
				]
			}
		}
	);
});

suite('matrix:0', () => {
	matrixTest(
		[0],
		{
			UMMM: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UUMM: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FUMM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TUMM: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMUM: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FMUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMUM: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUUM: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FUUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TUUM: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UFUM: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FFUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFUM: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTUM: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTUM: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTUM: {
				false: [
					undefined,
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMMU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FMMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMMU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUMU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FUMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TUMU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UFMU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FFMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFMU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTMU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTMU: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTMU: {
				false: [
					undefined,
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMUU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FMUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMUU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUUU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FUUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TUUU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UFUU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FFUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFUU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTUU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTUU: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTUU: {
				false: [
					undefined,
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMFU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FMFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TMFU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUFU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FUFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TUFU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UFFU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FFFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TFFU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTFU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTFU: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTFU: {
				false: [
					undefined,
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMTU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FMTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TMTU: {
				false: [
					undefined,
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			UUTU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: false, offset: 1 },
					{ key: [0], inclusive: false, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FUTU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TUTU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UFTU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					{ key: [0], inclusive: true, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FFTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TFTU: {
				false: [
					undefined,
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			UTTU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					[0],
					[1]
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			FTTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[0],
					[1]
				],
				true: [
					undefined,
					undefined,
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TTTU: {
				false: [
					undefined,
					undefined,
					[],
					[0],
					[1]
				],
				true: [
					undefined,
					[],
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				]
			}
		}
	);
});

suite('matrix:1', () => {
	const na = {
		false: [
			{ key: [1], inclusive: false, offset: -2 },
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			{ key: [1], inclusive: false, offset: 1 },
			{ key: [1], inclusive: false, offset: 2 }
		],
		true: [
			{ key: [1], inclusive: true, offset: -2 },
			{ key: [1], inclusive: true, offset: -1 },
			{ key: [1], inclusive: true, offset: 0 },
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		]
	};

	matrixTest(
		[1],
		{
			UMMM: na,
			UUMM: na,
			FUMM: na,
			TUMM: na,
			UMUM: na,
			FMUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TMUM: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UUUM: na,
			FUUM: na,
			TUUM: na,
			UFUM: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFUM: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TFUM: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UTUM: {
				false: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FTUM: {
				false: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TTUM: {
				false: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UMMU: na,
			FMMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMMU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUMU: na,
			FUMU: na,
			TUMU: na,
			UFMU: na,
			FFMU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFMU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTMU: {
				false: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTMU: {
				false: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTMU: {
				false: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMUU: na,
			FMUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TMUU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UUUU: na,
			FUUU: na,
			TUUU: na,
			UFUU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFUU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TFUU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UTUU: {
				false: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FTUU: {
				false: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TTUU: {
				false: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UMFU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FMFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TMFU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUFU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FUFU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [1], inclusive: true, offset: -2 },
					{ key: [1], inclusive: true, offset: -1 },
					{ key: [1], inclusive: true, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TUFU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UFFU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFFU: {
				false: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					undefined,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TFFU: {
				false: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[],
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTFU: {
				false: [
					{ key: [0], inclusive: true, offset: -2 }, // TODO: should be false:-1 ?
					{ key: [0], inclusive: true, offset: -1 }, // TODO: should be false:0 ?
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTFU: {
				false: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					undefined,
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTFU: {
				false: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					undefined,
					[],
					[0],
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: true, offset: -2 },
					{ key: [1], inclusive: true, offset: -1 },
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			FMTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TMTU: {
				false: [
					undefined,
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			UUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: true, offset: -2 },
					{ key: [1], inclusive: true, offset: -1 },
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			FUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: true, offset: -2 },
					{ key: [1], inclusive: true, offset: -1 },
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: true, offset: -2 },
					{ key: [1], inclusive: true, offset: -1 },
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			UFTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: true, offset: -2 },
					{ key: [1], inclusive: true, offset: -1 },
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			FFTU: {
				false: [
					undefined,
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					undefined,
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TFTU: {
				false: [
					undefined,
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					[],
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			UTTU: {
				false: [
					{ key: [0], inclusive: true, offset: -2 },
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: true, offset: -1 },
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			FTTU: {
				false: [
					undefined,
					undefined,
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					undefined,
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TTTU: {
				false: [
					undefined,
					[],
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					[],
					[0],
					[1],
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			}
		}
	);
});

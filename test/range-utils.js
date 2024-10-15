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
				// if (+offset !== 2) {
				// 	continue;
				// }

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
		// if (state !== 'TUFU') {
		// 	continue;
		// }

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
			}
		}
	);
});

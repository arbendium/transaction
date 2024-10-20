// @ts-check

import assert from 'node:assert';
import test, { suite } from 'node:test';
import RangeIndex from '../lib/RangeIndex.js';
import resolveCachedKeySelector from '../lib/resolveCachedKeySelector.js';
import { emptyBuffer } from '../lib/util.js';

/**
 * @typedef {(
 *   | { key: number[], inclusive: boolean, offset: number }
 *   | number
 *   | undefined
 * )} SimpleResult
 */

/** @type {import('../lib/types.js').RangeIndexEntry} */
const defaultEntry = {
	mutations: undefined,
	promise: undefined,
	readConflict: false,
	writeConflict: false
};

/**
 * @param {[number[], boolean | undefined][]} values
 * @returns {RangeIndex<
 *   import('../lib/types.js').RangeIndexEntry,
 *   import('../lib/types.js').RangeIndexEntry
 * >}
 */
function createIndex(values) {
	/**
	 * @type {RangeIndex<
	 *   import('../lib/types.js').RangeIndexEntry,
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
						{
							key: keyBuffer,
							inclusive,
							offset: +offset
						},
						index
					);

					assert.deepStrictEqual(
						result,
						typeof value === 'number' || value == null
							? value
							: { key: Buffer.from(value.key), inclusive: value.inclusive, offset: value.offset }
					);
				});
			}
		}
	}
}

/**
 * @param {number[]} key
 * @param {string} state
 * @param {{ false?: SimpleResult[], true?: SimpleResult[] }} expectResults
 */
function matrixTest2(key, state, expectResults) {
	return () => {
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

		const normalizedExpectResult = Object.fromEntries(Object.entries(expectResults).map(
			([key, value]) => {
				const offsetRange = Math.floor(value.length / 2);

				return [key, Object.fromEntries(value.map((v, i) => [i - offsetRange, v]))];
			}
		));

		genericTest(ranges, key, normalizedExpectResult);
	};
}

/**
 * @param {number[]} key
 * @param {Record<string, { false?: SimpleResult[], true?: SimpleResult[] }>} expectResults
 */
function matrixTest(key, expectResults) {
	for (const [state, expectResult] of Object.entries(expectResults)) {
		suite(state, () => {
			matrixTest2(key, state, expectResult)();
		});
	}
}

suite('matrix:', () => {
	const na = {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: false, offset: 1 },
			{ key: [], inclusive: false, offset: 2 }
		],
		true: [
			-1,
			-1,
			{ key: [], inclusive: true, offset: 0 },
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		]
	};

	matrixTest(
		[],
		{
			UMMM: na,
			UUMM: na,
			FUMM: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUMM: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UMUM: na,
			FMUM: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMUM: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUUM: na,
			FUUM: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUUM: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFUM: na,
			FFUM: {
				false: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFUM: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTUM: na,
			FTUM: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			TTUM: {
				false: [
					-1,
					-1,
					-1,
					0,
					1
				],
				true: [
					-1,
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			UMMU: na,
			FMMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMMU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUMU: na,
			FUMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUMU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFMU: na,
			FFMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFMU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTMU: na,
			FTMU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			TTMU: {
				false: [
					-1,
					-1,
					-1,
					0,
					1
				],
				true: [
					-1,
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			UMUU: na,
			FMUU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMUU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUUU: na,
			FUUU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUUU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFUU: na,
			FFUU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFUU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTUU: na,
			FTUU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			TTUU: {
				false: [
					-1,
					-1,
					-1,
					0,
					1
				],
				true: [
					-1,
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			UMFU: na,
			FMFU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TMFU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUFU: na,
			FUFU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUFU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFFU: na,
			FFFU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TFFU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTFU: na,
			FTFU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TTFU: {
				false: [
					-1,
					-1,
					-1,
					0,
					1
				],
				true: [
					-1,
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				]
			},
			UMTU: na,
			FMTU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TMTU: {
				false: [
					-1,
					-1,
					-1,
					0,
					1
				],
				true: [
					-1,
					-1,
					0,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			UUTU: na,
			FUTU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TUTU: {
				false: [
					-1,
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UFTU: na,
			FFTU: {
				false: [
					-1,
					-1,
					-1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					-1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TFTU: {
				false: [
					-1,
					-1,
					-1,
					0,
					2
				],
				true: [
					-1,
					-1,
					0,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			UTTU: na,
			FTTU: {
				false: [
					-1,
					-1,
					-1,
					1,
					2
				],
				true: [
					-1,
					-1,
					-1,
					1,
					2
				]
			},
			TTTU: {
				false: [
					-1,
					-1,
					-1,
					0,
					1
				],
				true: [
					-1,
					-1,
					0,
					1,
					2
				]
			}
		}
	);
});

suite('matrix:0', () => {
	const na = {
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
	};

	matrixTest(
		[0],
		{
			UMMM: na,
			UUMM: na,
			FUMM: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TUMM: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UMUM: na,
			FMUM: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMUM: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUUM: na,
			FUUM: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TUUM: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UFUM: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFUM: {
				false: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFUM: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTUM: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTUM: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTUM: {
				false: [
					-1,
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMMU: na,
			FMMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMMU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUMU: na,
			FUMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TUMU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UFMU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFMU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTMU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTMU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTMU: {
				false: [
					-1,
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMUU: na,
			FMUU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMUU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUUU: na,
			FUUU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TUUU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UFUU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFUU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFUU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTUU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTUU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTUU: {
				false: [
					-1,
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMFU: na,
			FMFU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TMFU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UUFU: na,
			FUFU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TUFU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UFFU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFFU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TFFU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTFU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTFU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTFU: {
				false: [
					-1,
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMTU: na,
			FMTU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TMTU: {
				false: [
					-1,
					-1,
					0,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			UUTU: na,
			FUTU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TUTU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UFTU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: na.true
			},
			FFTU: {
				false: [
					-1,
					-1,
					-1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					-1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TFTU: {
				false: [
					-1,
					-1,
					0,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					0,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			UTTU: {
				false: [
					{ key: [0], inclusive: false, offset: -2 },
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					2
				],
				true: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			FTTU: {
				false: [
					-1,
					-1,
					-1,
					1,
					2
				],
				true: [
					-1,
					-1,
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				]
			},
			TTTU: {
				false: [
					-1,
					-1,
					0,
					1,
					2
				],
				true: [
					-1,
					0,
					1,
					2,
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
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TMUM: {
				false: [
					-1,
					-1,
					0,
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
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TFUM: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UTUM: {
				false: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FTUM: {
				false: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TTUM: {
				false: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UMMU: na,
			FMMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			TMMU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
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
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TFMU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTMU: {
				false: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTMU: {
				false: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTMU: {
				false: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMUU: na,
			FMUU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TMUU: {
				false: [
					-1,
					-1,
					0,
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
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TFUU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UTUU: {
				false: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FTUU: {
				false: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TTUU: {
				false: [
					-1,
					0,
					1,
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
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TMFU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
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
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TFFU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				]
			},
			UTFU: {
				false: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			FTFU: {
				false: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			TTFU: {
				false: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				]
			},
			UMTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					1,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			FMTU: {
				false: [
					-1,
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TMTU: {
				false: [
					-1,
					-1,
					0,
					1,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					0,
					1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			UUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			FUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			UFTU: {
				false: [
					{ key: [1], inclusive: false, offset: -2 },
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			FFTU: {
				false: [
					-1,
					-1,
					-1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					-1,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TFTU: {
				false: [
					-1,
					-1,
					0,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					0,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			UTTU: {
				false: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					{ key: [0], inclusive: false, offset: 0 },
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			FTTU: {
				false: [
					-1,
					-1,
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					-1,
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			},
			TTTU: {
				false: [
					-1,
					0,
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 }
				],
				true: [
					0,
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				]
			}
		}
	);
});

suite('matrix:2', () => {
	const na = {
		false: [
			{ key: [2], inclusive: false, offset: -2 },
			{ key: [2], inclusive: false, offset: -1 },
			{ key: [2], inclusive: false, offset: 0 },
			{ key: [2], inclusive: false, offset: 1 },
			{ key: [2], inclusive: false, offset: 2 }
		],
		true: [
			{ key: [2], inclusive: true, offset: -2 },
			{ key: [2], inclusive: true, offset: -1 },
			{ key: [2], inclusive: true, offset: 0 },
			{ key: [2], inclusive: true, offset: 1 },
			{ key: [2], inclusive: true, offset: 2 }
		]
	};

	matrixTest(
		[2],
		{
			UMMM: na,
			UUMM: na,
			FUMM: na,
			TUMM: na,
			UMUM: na,
			FMUM: na,
			TMUM: na,
			UUUM: na,
			FUUM: na,
			TUUM: na,
			UFUM: na,
			FFUM: na,
			TFUM: na,
			UTUM: na,
			FTUM: na,
			TTUM: na,
			UMMU: na,
			FMMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TMMU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UUMU: na,
			FUMU: na,
			TUMU: na,
			UFMU: {
				false: [
					{ key: [2], inclusive: false, offset: -2 },
					{ key: [2], inclusive: false, offset: -1 },
					{ key: [2], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFMU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TFMU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UTMU: {
				false: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FTMU: {
				false: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TTMU: {
				false: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UMUU: na,
			FMUU: na,
			TMUU: na,
			UUUU: na,
			FUUU: na,
			TUUU: na,
			UFUU: na,
			FFUU: na,
			TFUU: na,
			UTUU: na,
			FTUU: na,
			TTUU: na,
			UMFU: {
				false: [
					{ key: [2], inclusive: false, offset: -2 },
					{ key: [2], inclusive: false, offset: -1 },
					{ key: [2], inclusive: false, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FMFU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TMFU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UUFU: {
				false: [
					{ key: [2], inclusive: false, offset: -2 },
					{ key: [2], inclusive: false, offset: -1 },
					{ key: [2], inclusive: false, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FUFU: {
				false: [
					{ key: [2], inclusive: false, offset: -2 },
					{ key: [2], inclusive: false, offset: -1 },
					{ key: [2], inclusive: false, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TUFU: {
				false: [
					{ key: [2], inclusive: false, offset: -2 },
					{ key: [2], inclusive: false, offset: -1 },
					{ key: [2], inclusive: false, offset: 0 },
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UFFU: {
				false: [
					{ key: [2], inclusive: false, offset: -2 },
					{ key: [2], inclusive: false, offset: -1 },
					{ key: [2], inclusive: false, offset: 0 },
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFFU: {
				false: [
					-1,
					-1,
					-1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TFFU: {
				false: [
					-1,
					-1,
					0,
					{ key: [], inclusive: true, offset: 1 },
					{ key: [], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UTFU: {
				false: [
					{ key: [0], inclusive: false, offset: -1 },
					{ key: [0], inclusive: false, offset: 0 },
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FTFU: {
				false: [
					-1,
					-1,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TTFU: {
				false: [
					-1,
					0,
					1,
					{ key: [0], inclusive: true, offset: 1 },
					{ key: [0], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UMTU: {
				false: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FMTU: {
				false: [
					-1,
					-1,
					1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TMTU: {
				false: [
					-1,
					0,
					1,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TUTU: {
				false: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UFTU: {
				false: [
					{ key: [1], inclusive: false, offset: -1 },
					{ key: [1], inclusive: false, offset: 0 },
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FFTU: {
				false: [
					-1,
					-1,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TFTU: {
				false: [
					-1,
					0,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			UTTU: {
				false: [
					{ key: [0], inclusive: false, offset: 0 },
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			FTTU: {
				false: [
					-1,
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			},
			TTTU: {
				false: [
					0,
					1,
					2,
					{ key: [1], inclusive: true, offset: 1 },
					{ key: [1], inclusive: true, offset: 2 }
				],
				true: na.true
			}
		}
	);
});

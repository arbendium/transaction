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

	suite('UMMM', matrixTest2([], 'UMMM', na));
	suite('UUMM', matrixTest2([], 'UUMM', na));
	suite('FUMM', matrixTest2([], 'FUMM', {
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
	}));
	suite('TUMM', matrixTest2([], 'TUMM', {
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
	}));
	suite('UMUM', matrixTest2([], 'UMUM', na));
	suite('FMUM', matrixTest2([], 'FMUM', {
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
	}));
	suite('TMUM', matrixTest2([], 'TMUM', {
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
	}));
	suite('UUUM', matrixTest2([], 'UUUM', na));
	suite('FUUM', matrixTest2([], 'FUUM', {
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
	}));
	suite('TUUM', matrixTest2([], 'TUUM', {
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
	}));
	suite('UFUM', matrixTest2([], 'UFUM', na));
	suite('FFUM', matrixTest2([], 'FFUM', {
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
	}));
	suite('TFUM', matrixTest2([], 'TFUM', {
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
	}));
	suite('UTUM', matrixTest2([], 'UTUM', na));
	suite('FTUM', matrixTest2([], 'FTUM', {
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
	}));
	suite('TTUM', matrixTest2([], 'TTUM', {
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
	}));
	suite('UMMU', matrixTest2([], 'UMMU', na));
	suite('FMMU', matrixTest2([], 'FMMU', {
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
	}));
	suite('TMMU', matrixTest2([], 'TMMU', {
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
	}));
	suite('UUMU', matrixTest2([], 'UUMU', na));
	suite('FUMU', matrixTest2([], 'FUMU', {
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
	}));
	suite('TUMU', matrixTest2([], 'TUMU', {
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
	}));
	suite('UFMU', matrixTest2([], 'UFMU', na));
	suite('FFMU', matrixTest2([], 'FFMU', {
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
	}));
	suite('TFMU', matrixTest2([], 'TFMU', {
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
	}));
	suite('UTMU', matrixTest2([], 'UTMU', na));
	suite('FTMU', matrixTest2([], 'FTMU', {
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
	}));
	suite('TTMU', matrixTest2([], 'TTMU', {
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
	}));
	suite('UMUU', matrixTest2([], 'UMUU', na));
	suite('FMUU', matrixTest2([], 'FMUU', {
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
	}));
	suite('TMUU', matrixTest2([], 'TMUU', {
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
	}));
	suite('UUUU', matrixTest2([], 'UUUU', na));
	suite('FUUU', matrixTest2([], 'FUUU', {
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
	}));
	suite('TUUU', matrixTest2([], 'TUUU', {
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
	}));
	suite('UFUU', matrixTest2([], 'UFUU', na));
	suite('FFUU', matrixTest2([], 'FFUU', {
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
	}));
	suite('TFUU', matrixTest2([], 'TFUU', {
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
	}));
	suite('UTUU', matrixTest2([], 'UTUU', na));
	suite('FTUU', matrixTest2([], 'FTUU', {
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
	}));
	suite('TTUU', matrixTest2([], 'TTUU', {
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
	}));
	suite('UMFU', matrixTest2([], 'UMFU', na));
	suite('FMFU', matrixTest2([], 'FMFU', {
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
	}));
	suite('TMFU', matrixTest2([], 'TMFU', {
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
	}));
	suite('UUFU', matrixTest2([], 'UUFU', na));
	suite('FUFU', matrixTest2([], 'FUFU', {
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
	}));
	suite('TUFU', matrixTest2([], 'TUFU', {
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
	}));
	suite('UFFU', matrixTest2([], 'UFFU', na));
	suite('FFFU', matrixTest2([], 'FFFU', {
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
	}));
	suite('TFFU', matrixTest2([], 'TFFU', {
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
	}));
	suite('UTFU', matrixTest2([], 'UTFU', na));
	suite('FTFU', matrixTest2([], 'FTFU', {
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
	}));
	suite('TTFU', matrixTest2([], 'TTFU', {
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
	}));
	suite('UMTU', matrixTest2([], 'UMTU', na));
	suite('FMTU', matrixTest2([], 'FMTU', {
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
	}));
	suite('TMTU', matrixTest2([], 'TMTU', {
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
	}));
	suite('UUTU', matrixTest2([], 'UUTU', na));
	suite('FUTU', matrixTest2([], 'FUTU', {
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
	}));
	suite('TUTU', matrixTest2([], 'TUTU', {
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
	}));
	suite('UFTU', matrixTest2([], 'UFTU', na));
	suite('FFTU', matrixTest2([], 'FFTU', {
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
	}));
	suite('TFTU', matrixTest2([], 'TFTU', {
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
	}));
	suite('UTTU', matrixTest2([], 'UTTU', na));
	suite('FTTU', matrixTest2([], 'FTTU', {
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
	}));
	suite('TTTU', matrixTest2([], 'TTTU', {
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
	}));
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

	suite('UMMM', matrixTest2([0], 'UMMM', na));
	suite('UUMM', matrixTest2([0], 'UUMM', na));
	suite('FUMM', matrixTest2([0], 'FUMM', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TUMM', matrixTest2([0], 'TUMM', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UMUM', matrixTest2([0], 'UMUM', na));
	suite('FMUM', matrixTest2([0], 'FMUM', {
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
	}));
	suite('TMUM', matrixTest2([0], 'TMUM', {
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
	}));
	suite('UUUM', matrixTest2([0], 'UUUM', na));
	suite('FUUM', matrixTest2([0], 'FUUM', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TUUM', matrixTest2([0], 'TUUM', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UFUM', matrixTest2([0], 'UFUM', {
		false: [
			{ key: [0], inclusive: false, offset: -2 },
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFUM', matrixTest2([0], 'FFUM', {
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
	}));
	suite('TFUM', matrixTest2([0], 'TFUM', {
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
	}));
	suite('UTUM', matrixTest2([0], 'UTUM', {
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
	}));
	suite('FTUM', matrixTest2([0], 'FTUM', {
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
	}));
	suite('TTUM', matrixTest2([0], 'TTUM', {
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
	}));
	suite('UMMU', matrixTest2([0], 'UMMU', na));
	suite('FMMU', matrixTest2([0], 'FMMU', {
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
	}));
	suite('TMMU', matrixTest2([0], 'TMMU', {
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
	}));
	suite('UUMU', matrixTest2([0], 'UUMU', na));
	suite('FUMU', matrixTest2([0], 'FUMU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TUMU', matrixTest2([0], 'TUMU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UFMU', matrixTest2([0], 'UFMU', {
		false: [
			{ key: [0], inclusive: false, offset: -2 },
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFMU', matrixTest2([0], 'FFMU', {
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
	}));
	suite('TFMU', matrixTest2([0], 'TFMU', {
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
	}));
	suite('UTMU', matrixTest2([0], 'UTMU', {
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
	}));
	suite('FTMU', matrixTest2([0], 'FTMU', {
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
	}));
	suite('TTMU', matrixTest2([0], 'TTMU', {
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
	}));
	suite('UMUU', matrixTest2([0], 'UMUU', na));
	suite('FMUU', matrixTest2([0], 'FMUU', {
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
	}));
	suite('TMUU', matrixTest2([0], 'TMUU', {
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
	}));
	suite('UUUU', matrixTest2([0], 'UUUU', na));
	suite('FUUU', matrixTest2([0], 'FUUU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TUUU', matrixTest2([0], 'TUUU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UFUU', matrixTest2([0], 'UFUU', {
		false: [
			{ key: [0], inclusive: false, offset: -2 },
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFUU', matrixTest2([0], 'FFUU', {
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
	}));
	suite('TFUU', matrixTest2([0], 'TFUU', {
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
	}));
	suite('UTUU', matrixTest2([0], 'UTUU', {
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
	}));
	suite('FTUU', matrixTest2([0], 'FTUU', {
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
	}));
	suite('TTUU', matrixTest2([0], 'TTUU', {
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
	}));
	suite('UMFU', matrixTest2([0], 'UMFU', na));
	suite('FMFU', matrixTest2([0], 'FMFU', {
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
	}));
	suite('TMFU', matrixTest2([0], 'TMFU', {
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
	}));
	suite('UUFU', matrixTest2([0], 'UUFU', na));
	suite('FUFU', matrixTest2([0], 'FUFU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TUFU', matrixTest2([0], 'TUFU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UFFU', matrixTest2([0], 'UFFU', {
		false: [
			{ key: [0], inclusive: false, offset: -2 },
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFFU', matrixTest2([0], 'FFFU', {
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
	}));
	suite('TFFU', matrixTest2([0], 'TFFU', {
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
	}));
	suite('UTFU', matrixTest2([0], 'UTFU', {
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
	}));
	suite('FTFU', matrixTest2([0], 'FTFU', {
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
	}));
	suite('TTFU', matrixTest2([0], 'TTFU', {
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
	}));
	suite('UMTU', matrixTest2([0], 'UMTU', na));
	suite('FMTU', matrixTest2([0], 'FMTU', {
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
	}));
	suite('TMTU', matrixTest2([0], 'TMTU', {
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
	}));
	suite('UUTU', matrixTest2([0], 'UUTU', na));
	suite('FUTU', matrixTest2([0], 'FUTU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TUTU', matrixTest2([0], 'TUTU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UFTU', matrixTest2([0], 'UFTU', {
		false: [
			{ key: [0], inclusive: false, offset: -2 },
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			2,
			{ key: [1], inclusive: true, offset: 1 }
		],
		true: na.true
	}));
	suite('FFTU', matrixTest2([0], 'FFTU', {
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
	}));
	suite('TFTU', matrixTest2([0], 'TFTU', {
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
	}));
	suite('UTTU', matrixTest2([0], 'UTTU', {
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
	}));
	suite('FTTU', matrixTest2([0], 'FTTU', {
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
	}));
	suite('TTTU', matrixTest2([0], 'TTTU', {
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
	}));
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

	suite('UMMM', matrixTest2([1], 'UMMM', na));
	suite('UUMM', matrixTest2([1], 'UUMM', na));
	suite('FUMM', matrixTest2([1], 'FUMM', na));
	suite('TUMM', matrixTest2([1], 'TUMM', na));
	suite('UMUM', matrixTest2([1], 'UMUM', na));
	suite('FMUM', matrixTest2([1], 'FMUM', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TMUM', matrixTest2([1], 'TMUM', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UUUM', matrixTest2([1], 'UUUM', na));
	suite('FUUM', matrixTest2([1], 'FUUM', na));
	suite('TUUM', matrixTest2([1], 'TUUM', na));
	suite('UFUM', matrixTest2([1], 'UFUM', {
		false: [
			{ key: [1], inclusive: false, offset: -2 },
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFUM', matrixTest2([1], 'FFUM', {
		false: [
			-1,
			-1,
			-1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TFUM', matrixTest2([1], 'TFUM', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UTUM', matrixTest2([1], 'UTUM', {
		false: [
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FTUM', matrixTest2([1], 'FTUM', {
		false: [
			-1,
			-1,
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TTUM', matrixTest2([1], 'TTUM', {
		false: [
			-1,
			0,
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UMMU', matrixTest2([1], 'UMMU', na));
	suite('FMMU', matrixTest2([1], 'FMMU', {
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
	}));
	suite('TMMU', matrixTest2([1], 'TMMU', {
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
	}));
	suite('UUMU', matrixTest2([1], 'UUMU', na));
	suite('FUMU', matrixTest2([1], 'FUMU', na));
	suite('TUMU', matrixTest2([1], 'TUMU', na));
	suite('UFMU', matrixTest2([1], 'UFMU', na));
	suite('FFMU', matrixTest2([1], 'FFMU', {
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
	}));
	suite('TFMU', matrixTest2([1], 'TFMU', {
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
	}));
	suite('UTMU', matrixTest2([1], 'UTMU', {
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
	}));
	suite('FTMU', matrixTest2([1], 'FTMU', {
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
	}));
	suite('TTMU', matrixTest2([1], 'TTMU', {
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
	}));
	suite('UMUU', matrixTest2([1], 'UMUU', na));
	suite('FMUU', matrixTest2([1], 'FMUU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TMUU', matrixTest2([1], 'TMUU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UUUU', matrixTest2([1], 'UUUU', na));
	suite('FUUU', matrixTest2([1], 'FUUU', na));
	suite('TUUU', matrixTest2([1], 'TUUU', na));
	suite('UFUU', matrixTest2([1], 'UFUU', {
		false: [
			{ key: [1], inclusive: false, offset: -2 },
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFUU', matrixTest2([1], 'FFUU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TFUU', matrixTest2([1], 'TFUU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UTUU', matrixTest2([1], 'UTUU', {
		false: [
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FTUU', matrixTest2([1], 'FTUU', {
		false: [
			-1,
			-1,
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TTUU', matrixTest2([1], 'TTUU', {
		false: [
			-1,
			0,
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UMFU', matrixTest2([1], 'UMFU', {
		false: [
			{ key: [1], inclusive: false, offset: -2 },
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FMFU', matrixTest2([1], 'FMFU', {
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
	}));
	suite('TMFU', matrixTest2([1], 'TMFU', {
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
	}));
	suite('UUFU', matrixTest2([1], 'UUFU', {
		false: [
			{ key: [1], inclusive: false, offset: -2 },
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FUFU', matrixTest2([1], 'FUFU', {
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
	}));
	suite('TUFU', matrixTest2([1], 'TUFU', {
		false: [
			{ key: [1], inclusive: false, offset: -2 },
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UFFU', matrixTest2([1], 'UFFU', {
		false: [
			{ key: [1], inclusive: false, offset: -2 },
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFFU', matrixTest2([1], 'FFFU', {
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
	}));
	suite('TFFU', matrixTest2([1], 'TFFU', {
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
	}));
	suite('UTFU', matrixTest2([1], 'UTFU', {
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
	}));
	suite('FTFU', matrixTest2([1], 'FTFU', {
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
	}));
	suite('TTFU', matrixTest2([1], 'TTFU', {
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
	}));
	suite('UMTU', matrixTest2([1], 'UMTU', {
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
	}));
	suite('FMTU', matrixTest2([1], 'FMTU', {
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
	}));
	suite('TMTU', matrixTest2([1], 'TMTU', {
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
	}));
	suite('UUTU', matrixTest2([1], 'UUTU', {
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
	}));
	suite('FUTU', matrixTest2([1], 'FUTU', {
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
	}));
	suite('TUTU', matrixTest2([1], 'TUTU', {
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
	}));
	suite('UFTU', matrixTest2([1], 'UFTU', {
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
	}));
	suite('FFTU', matrixTest2([1], 'FFTU', {
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
	}));
	suite('TFTU', matrixTest2([1], 'TFTU', {
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
	}));
	suite('UTTU', matrixTest2([1], 'UTTU', {
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
	}));
	suite('FTTU', matrixTest2([1], 'FTTU', {
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
	}));
	suite('TTTU', matrixTest2([1], 'TTTU', {
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
	}));
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

	suite('UMMM', matrixTest2([2], 'UMMM', na));
	suite('UUMM', matrixTest2([2], 'UUMM', na));
	suite('FUMM', matrixTest2([2], 'FUMM', na));
	suite('TUMM', matrixTest2([2], 'TUMM', na));
	suite('UMUM', matrixTest2([2], 'UMUM', na));
	suite('FMUM', matrixTest2([2], 'FMUM', na));
	suite('TMUM', matrixTest2([2], 'TMUM', na));
	suite('UUUM', matrixTest2([2], 'UUUM', na));
	suite('FUUM', matrixTest2([2], 'FUUM', na));
	suite('TUUM', matrixTest2([2], 'TUUM', na));
	suite('UFUM', matrixTest2([2], 'UFUM', na));
	suite('FFUM', matrixTest2([2], 'FFUM', na));
	suite('TFUM', matrixTest2([2], 'TFUM', na));
	suite('UTUM', matrixTest2([2], 'UTUM', na));
	suite('FTUM', matrixTest2([2], 'FTUM', na));
	suite('TTUM', matrixTest2([2], 'TTUM', na));
	suite('UMMU', matrixTest2([2], 'UMMU', na));
	suite('FMMU', matrixTest2([2], 'FMMU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TMMU', matrixTest2([2], 'TMMU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UUMU', matrixTest2([2], 'UUMU', na));
	suite('FUMU', matrixTest2([2], 'FUMU', na));
	suite('TUMU', matrixTest2([2], 'TUMU', na));
	suite('UFMU', matrixTest2([2], 'UFMU', {
		false: [
			{ key: [2], inclusive: false, offset: -2 },
			{ key: [2], inclusive: false, offset: -1 },
			{ key: [2], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFMU', matrixTest2([2], 'FFMU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TFMU', matrixTest2([2], 'TFMU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UTMU', matrixTest2([2], 'UTMU', {
		false: [
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FTMU', matrixTest2([2], 'FTMU', {
		false: [
			-1,
			-1,
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TTMU', matrixTest2([2], 'TTMU', {
		false: [
			-1,
			0,
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UMUU', matrixTest2([2], 'UMUU', na));
	suite('FMUU', matrixTest2([2], 'FMUU', na));
	suite('TMUU', matrixTest2([2], 'TMUU', na));
	suite('UUUU', matrixTest2([2], 'UUUU', na));
	suite('FUUU', matrixTest2([2], 'FUUU', na));
	suite('TUUU', matrixTest2([2], 'TUUU', na));
	suite('UFUU', matrixTest2([2], 'UFUU', na));
	suite('FFUU', matrixTest2([2], 'FFUU', na));
	suite('TFUU', matrixTest2([2], 'TFUU', na));
	suite('UTUU', matrixTest2([2], 'UTUU', na));
	suite('FTUU', matrixTest2([2], 'FTUU', na));
	suite('TTUU', matrixTest2([2], 'TTUU', na));
	suite('UMFU', matrixTest2([2], 'UMFU', {
		false: [
			{ key: [2], inclusive: false, offset: -2 },
			{ key: [2], inclusive: false, offset: -1 },
			{ key: [2], inclusive: false, offset: 0 },
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FMFU', matrixTest2([2], 'FMFU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TMFU', matrixTest2([2], 'TMFU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UUFU', matrixTest2([2], 'UUFU', {
		false: [
			{ key: [2], inclusive: false, offset: -2 },
			{ key: [2], inclusive: false, offset: -1 },
			{ key: [2], inclusive: false, offset: 0 },
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FUFU', matrixTest2([2], 'FUFU', {
		false: [
			{ key: [2], inclusive: false, offset: -2 },
			{ key: [2], inclusive: false, offset: -1 },
			{ key: [2], inclusive: false, offset: 0 },
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TUFU', matrixTest2([2], 'TUFU', {
		false: [
			{ key: [2], inclusive: false, offset: -2 },
			{ key: [2], inclusive: false, offset: -1 },
			{ key: [2], inclusive: false, offset: 0 },
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UFFU', matrixTest2([2], 'UFFU', {
		false: [
			{ key: [2], inclusive: false, offset: -2 },
			{ key: [2], inclusive: false, offset: -1 },
			{ key: [2], inclusive: false, offset: 0 },
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFFU', matrixTest2([2], 'FFFU', {
		false: [
			-1,
			-1,
			-1,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TFFU', matrixTest2([2], 'TFFU', {
		false: [
			-1,
			-1,
			0,
			{ key: [], inclusive: true, offset: 1 },
			{ key: [], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UTFU', matrixTest2([2], 'UTFU', {
		false: [
			{ key: [0], inclusive: false, offset: -1 },
			{ key: [0], inclusive: false, offset: 0 },
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FTFU', matrixTest2([2], 'FTFU', {
		false: [
			-1,
			-1,
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TTFU', matrixTest2([2], 'TTFU', {
		false: [
			-1,
			0,
			1,
			{ key: [0], inclusive: true, offset: 1 },
			{ key: [0], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UMTU', matrixTest2([2], 'UMTU', {
		false: [
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			1,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FMTU', matrixTest2([2], 'FMTU', {
		false: [
			-1,
			-1,
			1,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TMTU', matrixTest2([2], 'TMTU', {
		false: [
			-1,
			0,
			1,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UUTU', matrixTest2([2], 'UUTU', {
		false: [
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FUTU', matrixTest2([2], 'FUTU', {
		false: [
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TUTU', matrixTest2([2], 'TUTU', {
		false: [
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UFTU', matrixTest2([2], 'UFTU', {
		false: [
			{ key: [1], inclusive: false, offset: -1 },
			{ key: [1], inclusive: false, offset: 0 },
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FFTU', matrixTest2([2], 'FFTU', {
		false: [
			-1,
			-1,
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TFTU', matrixTest2([2], 'TFTU', {
		false: [
			-1,
			0,
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('UTTU', matrixTest2([2], 'UTTU', {
		false: [
			{ key: [0], inclusive: false, offset: 0 },
			1,
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('FTTU', matrixTest2([2], 'FTTU', {
		false: [
			-1,
			1,
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
	suite('TTTU', matrixTest2([2], 'TTTU', {
		false: [
			0,
			1,
			2,
			{ key: [1], inclusive: true, offset: 1 },
			{ key: [1], inclusive: true, offset: 2 }
		],
		true: na.true
	}));
});

// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import RangeIndex from '../lib/RangeIndex.js';

test('insert range (;)', () => {
	const index = new RangeIndex(/** @type {boolean} */(false), (_, b) => b, Object.is);

	index.addRange(Buffer.from([]), Buffer.from([]), true);

	assert.deepStrictEqual(index.ranges, [
		[Buffer.from([]), false]
	]);
});

test('insert range (0;0)', () => {
	const index = new RangeIndex(/** @type {boolean} */(false), (_, b) => b, Object.is);

	index.addRange(Buffer.from([0]), Buffer.from([0]), true);

	assert.deepStrictEqual(index.ranges, [
		[Buffer.from([]), false]
	]);
});

test('insert range (;1)', () => {
	const index = new RangeIndex(/** @type {boolean} */(false), (_, b) => b, Object.is);

	index.addRange(Buffer.from([]), Buffer.from([1]), true);

	assert.deepStrictEqual(index.ranges, [
		[Buffer.from([]), true],
		[Buffer.from([1]), false]
	]);
});

test('insert range (0;1)', () => {
	const index = new RangeIndex(/** @type {boolean} */(false), (_, b) => b, Object.is);

	index.addRange(Buffer.from([0]), Buffer.from([1]), true);

	assert.deepStrictEqual(index.ranges, [
		[Buffer.from([]), false],
		[Buffer.from([0]), true],
		[Buffer.from([1]), false]
	]);
});

describe('matrix insert', () => {
	/**
	 * @type {Array<[
	 *   number, number,
	 *   [number, boolean][], [number, boolean][], [number, boolean][]
	 * ]>}
	 */
	const variations = [
		[
			0, 0,
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			0, 1,
			[[0, true], [1, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, true], [1, false], [3, true], [6, false], [9, true]]
		],
		[
			0, 2,
			[[0, true], [2, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, true], [2, false], [3, true], [6, false], [9, true]]
		],
		[
			0, 3,
			[[0, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, true], [6, false], [9, true]]
		],
		[
			0, 4,
			[[0, true], [3, false], [4, true], [6, false], [9, true]],
			[[0, false], [4, true], [6, false], [9, true]],
			[[0, true], [6, false], [9, true]]
		],
		[
			0, 5,
			[[0, true], [3, false], [5, true], [6, false], [9, true]],
			[[0, false], [5, true], [6, false], [9, true]],
			[[0, true], [6, false], [9, true]]
		],
		[
			0, 6,
			[[0, true], [3, false], [9, true]],
			[[0, false], [9, true]],
			[[0, true], [6, false], [9, true]]
		],
		[
			0, 7,
			[[0, true], [3, false], [6, true], [7, false], [9, true]],
			[[0, false], [9, true]],
			[[0, true], [7, false], [9, true]]
		],
		[
			0, 8,
			[[0, true], [3, false], [6, true], [8, false], [9, true]],
			[[0, false], [9, true]],
			[[0, true], [8, false], [9, true]]
		],
		[
			0, 9,
			[[0, true], [3, false], [6, true]],
			[[0, false], [9, true]],
			[[0, true]]
		],
		[
			0, 10,
			[[0, true], [3, false], [6, true], [9, false], [10, true]],
			[[0, false], [10, true]],
			[[0, true]]
		],
		[
			1, 2,
			[[0, false], [1, true], [2, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [1, true], [2, false], [3, true], [6, false], [9, true]]
		],
		[
			1, 3,
			[[0, false], [1, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [1, true], [6, false], [9, true]]
		],
		[
			1, 4,
			[[0, false], [1, true], [3, false], [4, true], [6, false], [9, true]],
			[[0, false], [4, true], [6, false], [9, true]],
			[[0, false], [1, true], [6, false], [9, true]]
		],
		[
			1, 5,
			[[0, false], [1, true], [3, false], [5, true], [6, false], [9, true]],
			[[0, false], [5, true], [6, false], [9, true]],
			[[0, false], [1, true], [6, false], [9, true]]
		],
		[
			1, 6,
			[[0, false], [1, true], [3, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [1, true], [6, false], [9, true]]
		],
		[
			1, 7,
			[[0, false], [1, true], [3, false], [6, true], [7, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [1, true], [7, false], [9, true]]
		],
		[
			1, 8,
			[[0, false], [1, true], [3, false], [6, true], [8, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [1, true], [8, false], [9, true]]
		],
		[
			1, 9,
			[[0, false], [1, true], [3, false], [6, true]],
			[[0, false], [9, true]],
			[[0, false], [1, true]]
		],
		[
			1, 10,
			[[0, false], [1, true], [3, false], [6, true], [9, false], [10, true]],
			[[0, false], [10, true]],
			[[0, false], [1, true]]
		],
		[
			2, 3,
			[[0, false], [2, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [2, true], [6, false], [9, true]]
		],
		[
			2, 4,
			[[0, false], [2, true], [3, false], [4, true], [6, false], [9, true]],
			[[0, false], [4, true], [6, false], [9, true]],
			[[0, false], [2, true], [6, false], [9, true]]
		],
		[
			2, 5,
			[[0, false], [2, true], [3, false], [5, true], [6, false], [9, true]],
			[[0, false], [5, true], [6, false], [9, true]],
			[[0, false], [2, true], [6, false], [9, true]]
		],
		[
			2, 6,
			[[0, false], [2, true], [3, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [2, true], [6, false], [9, true]]
		],
		[
			2, 7,
			[[0, false], [2, true], [3, false], [6, true], [7, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [2, true], [7, false], [9, true]]
		],
		[
			2, 8,
			[[0, false], [2, true], [3, false], [6, true], [8, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [2, true], [8, false], [9, true]]
		],
		[
			2, 9,
			[[0, false], [2, true], [3, false], [6, true]],
			[[0, false], [9, true]],
			[[0, false], [2, true]]
		],
		[
			2, 10,
			[[0, false], [2, true], [3, false], [6, true], [9, false], [10, true]],
			[[0, false], [10, true]],
			[[0, false], [2, true]]
		],
		[
			3, 4,
			[[0, false], [4, true], [6, false], [9, true]],
			[[0, false], [4, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			3, 5,
			[[0, false], [5, true], [6, false], [9, true]],
			[[0, false], [5, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			3, 6,
			[[0, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			3, 7,
			[[0, false], [6, true], [7, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [3, true], [7, false], [9, true]]
		],
		[
			3, 8,
			[[0, false], [6, true], [8, false], [9, true]],
			[[0, false], [9, true]],
			[[0, false], [3, true], [8, false], [9, true]]
		],
		[
			3, 9,
			[[0, false], [6, true]],
			[[0, false], [9, true]],
			[[0, false], [3, true]]
		],
		[
			3, 10,
			[[0, false], [6, true], [9, false], [10, true]],
			[[0, false], [10, true]],
			[[0, false], [3, true]]
		],
		[
			4, 5,
			[[0, false], [3, true], [4, false], [5, true], [6, false], [9, true]],
			[[0, false], [3, true], [4, false], [5, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			4, 6,
			[[0, false], [3, true], [4, false], [9, true]],
			[[0, false], [3, true], [4, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			4, 7,
			[[0, false], [3, true], [4, false], [6, true], [7, false], [9, true]],
			[[0, false], [3, true], [4, false], [9, true]],
			[[0, false], [3, true], [7, false], [9, true]]
		],
		[
			4, 8,
			[[0, false], [3, true], [4, false], [6, true], [8, false], [9, true]],
			[[0, false], [3, true], [4, false], [9, true]],
			[[0, false], [3, true], [8, false], [9, true]]
		],
		[
			4, 9,
			[[0, false], [3, true], [4, false], [6, true]],
			[[0, false], [3, true], [4, false], [9, true]],
			[[0, false], [3, true]]
		],
		[
			4, 10,
			[[0, false], [3, true], [4, false], [6, true], [9, false], [10, true]],
			[[0, false], [3, true], [4, false], [10, true]],
			[[0, false], [3, true]]
		],
		[
			5, 6,
			[[0, false], [3, true], [5, false], [9, true]],
			[[0, false], [3, true], [5, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			5, 7,
			[[0, false], [3, true], [5, false], [6, true], [7, false], [9, true]],
			[[0, false], [3, true], [5, false], [9, true]],
			[[0, false], [3, true], [7, false], [9, true]]
		],
		[
			5, 8,
			[[0, false], [3, true], [5, false], [6, true], [8, false], [9, true]],
			[[0, false], [3, true], [5, false], [9, true]],
			[[0, false], [3, true], [8, false], [9, true]]
		],
		[
			5, 9,
			[[0, false], [3, true], [5, false], [6, true]],
			[[0, false], [3, true], [5, false], [9, true]],
			[[0, false], [3, true]]
		],
		[
			5, 10,
			[[0, false], [3, true], [5, false], [6, true], [9, false], [10, true]],
			[[0, false], [3, true], [5, false], [10, true]],
			[[0, false], [3, true]]
		],
		[
			6, 7,
			[[0, false], [3, true], [7, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [7, false], [9, true]]
		],
		[
			6, 8,
			[[0, false], [3, true], [8, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [8, false], [9, true]]
		],
		[
			6, 9,
			[[0, false], [3, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true]]
		],
		[
			6, 10,
			[[0, false], [3, true], [9, false], [10, true]],
			[[0, false], [3, true], [6, false], [10, true]],
			[[0, false], [3, true]]
		],
		[
			7, 8,
			[[0, false], [3, true], [6, false], [7, true], [8, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [7, true], [8, false], [9, true]]
		],
		[
			7, 9,
			[[0, false], [3, true], [6, false], [7, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [7, true]]
		],
		[
			7, 10,
			[[0, false], [3, true], [6, false], [7, true], [9, false], [10, true]],
			[[0, false], [3, true], [6, false], [10, true]],
			[[0, false], [3, true], [6, false], [7, true]]
		],
		[
			8, 9,
			[[0, false], [3, true], [6, false], [8, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [8, true]]
		],
		[
			8, 10,
			[[0, false], [3, true], [6, false], [8, true], [9, false], [10, true]],
			[[0, false], [3, true], [6, false], [10, true]],
			[[0, false], [3, true], [6, false], [8, true]]
		],
		[
			9, 9,
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			9, 10,
			[[0, false], [3, true], [6, false], [10, true]],
			[[0, false], [3, true], [6, false], [10, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		],
		[
			10, 10,
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]],
			[[0, false], [3, true], [6, false], [9, true]]
		]
	];

	/**
	 * @param {number} start
	 * @param {number} end
	 * @param {boolean | null} value
	 * @param {[number, boolean][]} expected
	 */
	function variant(start, end, value, expected) {
		/**
		 * @param {boolean} a
		 * @param {boolean | null} b
		 * @returns {boolean}
		 */
		function merge(a, b) {
			assert.notStrictEqual(a, null);

			if (b === null) {
				switch (a) {
				case true: return false;
				case false: return true;
				}
			}

			return b;
		}

		const index = new RangeIndex(/** @type {boolean} */(false), merge, Object.is);
		index.ranges = [
			[Buffer.from([0]), false],
			[Buffer.from([3]), true],
			[Buffer.from([6]), false],
			[Buffer.from([9]), true]
		];

		index.addRange(Buffer.from([start]), Buffer.from([end]), value);
		assert.deepStrictEqual(
			index.ranges,
			expected.map(([start, value]) => [Buffer.from([start]), value])
		);
	}

	for (const [start, end, expectedNull, expectedFalse, expectedTrue] of variations) {
		test(`${start} - ${end} - null`, () => variant(start, end, null, expectedNull));
		test(`${start} - ${end} - false`, () => variant(start, end, false, expectedFalse));
		test(`${start} - ${end} - true`, () => variant(start, end, true, expectedTrue));
	}
});

test('matrix range read', () => {
	/** @type {[number, number, [number, number, boolean][]][]} */
	const variations = [
		[0, 0, []],
		[0, 1, [[0, 1, false]]],
		[0, 2, [[0, 2, false]]],
		[0, 3, [[0, 3, false]]],
		[0, 4, [[0, 3, false], [3, 4, true]]],
		[0, 5, [[0, 3, false], [3, 5, true]]],
		[0, 6, [[0, 3, false], [3, 6, true]]],
		[0, 7, [[0, 3, false], [3, 6, true], [6, 7, false]]],
		[0, 8, [[0, 3, false], [3, 6, true], [6, 8, false]]],
		[0, 9, [[0, 3, false], [3, 6, true], [6, 9, false]]],
		[0, 10, [[0, 3, false], [3, 6, true], [6, 9, false], [9, 10, true]]],
		[1, 2, [[1, 2, false]]],
		[1, 3, [[1, 3, false]]],
		[1, 4, [[1, 3, false], [3, 4, true]]],
		[1, 5, [[1, 3, false], [3, 5, true]]],
		[1, 6, [[1, 3, false], [3, 6, true]]],
		[1, 7, [[1, 3, false], [3, 6, true], [6, 7, false]]],
		[1, 8, [[1, 3, false], [3, 6, true], [6, 8, false]]],
		[1, 9, [[1, 3, false], [3, 6, true], [6, 9, false]]],
		[1, 10, [[1, 3, false], [3, 6, true], [6, 9, false], [9, 10, true]]],
		[2, 3, [[2, 3, false]]],
		[2, 4, [[2, 3, false], [3, 4, true]]],
		[2, 5, [[2, 3, false], [3, 5, true]]],
		[2, 6, [[2, 3, false], [3, 6, true]]],
		[2, 7, [[2, 3, false], [3, 6, true], [6, 7, false]]],
		[2, 8, [[2, 3, false], [3, 6, true], [6, 8, false]]],
		[2, 9, [[2, 3, false], [3, 6, true], [6, 9, false]]],
		[2, 10, [[2, 3, false], [3, 6, true], [6, 9, false], [9, 10, true]]],
		[3, 4, [[3, 4, true]]],
		[3, 5, [[3, 5, true]]],
		[3, 6, [[3, 6, true]]],
		[3, 7, [[3, 6, true], [6, 7, false]]],
		[3, 8, [[3, 6, true], [6, 8, false]]],
		[3, 9, [[3, 6, true], [6, 9, false]]],
		[3, 10, [[3, 6, true], [6, 9, false], [9, 10, true]]],
		[4, 5, [[4, 5, true]]],
		[4, 6, [[4, 6, true]]],
		[4, 7, [[4, 6, true], [6, 7, false]]],
		[4, 8, [[4, 6, true], [6, 8, false]]],
		[4, 9, [[4, 6, true], [6, 9, false]]],
		[4, 10, [[4, 6, true], [6, 9, false], [9, 10, true]]],
		[5, 6, [[5, 6, true]]],
		[5, 7, [[5, 6, true], [6, 7, false]]],
		[5, 8, [[5, 6, true], [6, 8, false]]],
		[5, 9, [[5, 6, true], [6, 9, false]]],
		[5, 10, [[5, 6, true], [6, 9, false], [9, 10, true]]],
		[6, 7, [[6, 7, false]]],
		[6, 8, [[6, 8, false]]],
		[6, 9, [[6, 9, false]]],
		[6, 10, [[6, 9, false], [9, 10, true]]],
		[7, 8, [[7, 8, false]]],
		[7, 9, [[7, 9, false]]],
		[7, 10, [[7, 9, false], [9, 10, true]]],
		[8, 9, [[8, 9, false]]],
		[8, 10, [[8, 9, false], [9, 10, true]]],
		[9, 9, []],
		[9, 10, [[9, 10, true]]],
		[10, 10, []]
	];

	const index = new RangeIndex(/** @type {boolean} */(false), (_, b) => b, Object.is);
	index.ranges = [
		[Buffer.from([0]), false],
		[Buffer.from([3]), true],
		[Buffer.from([6]), false],
		[Buffer.from([9]), true]
	];

	for (const [start, end, expected] of variations) {
		const ranges = index.getRanges(Buffer.from([start]), Buffer.from([end]));

		assert.deepStrictEqual(
			ranges,
			expected.map(
				([start, end, value]) => [Buffer.from([start]), Buffer.from([end]), value]
			)
		);
	}
});

test('matrix read', () => {
	/** @type {[number, boolean][]} */
	const variations = [
		[0, false],
		[1, false],
		[2, true],
		[3, false],
		[4, true],
		[5, true]
	];

	const index = new RangeIndex(/** @type {boolean} */(false), (_, b) => b, Object.is);
	index.ranges = [
		[Buffer.from([0]), false],
		[Buffer.from([2]), true],
		[Buffer.from([3]), false],
		[Buffer.from([4]), true]
	];

	for (const [key, expected] of variations) {
		const value = index.get(Buffer.from([key]));

		assert.deepStrictEqual(value, expected);
	}
});

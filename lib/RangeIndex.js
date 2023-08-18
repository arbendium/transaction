// @ts-check

import assert from 'assert';
import { bufferMax, emptyBuffer } from './util.js';

/**
 * @template T
 * @template [E=T]
 */
export default class RangeIndex {
	/**
	 * @param {T} defaultValue
	 * @param {(a: T, b: E) => T} merge
	 * @param {(a: T, b: T) => boolean} compare
	 */
	constructor(defaultValue, merge, compare) {
		/** @type {[Buffer, T][]} */
		this.ranges = [[emptyBuffer, defaultValue]];

		/** @type {(a: T, b: E) => T} */
		this.merge = merge;

		/** @type {((a: T, b: T) => boolean)} */
		this.compare = compare;
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 * @param {E} value
	 */
	addRange(start, end, value) {
		if (Buffer.compare(start, end) >= 0) {
			return;
		}

		let startIndex = this.ranges.findLastIndex(([key]) => Buffer.compare(start, key) >= 0);
		let endIndex = this.ranges.findLastIndex(([key]) => Buffer.compare(end, key) >= 0);

		assert(startIndex !== -1 && endIndex !== -1);

		/** @type {[Buffer, T][]} */
		const newElements = [];

		let previousValue = this.merge(this.ranges[startIndex][1], value);

		if (this.compare(this.ranges[startIndex][1], previousValue)) {
			startIndex++;
		} else if (Buffer.compare(this.ranges[startIndex][0], start) === 0) {
			if (startIndex === 0 || !this.compare(this.ranges[startIndex - 1][1], previousValue)) {
				newElements.push([start, previousValue]);
			}
		} else {
			startIndex++;
			newElements.push([start, previousValue]);
		}

		for (let i = startIndex; i < endIndex; i++) {
			const newValue = this.merge(this.ranges[i][1], value);

			if (!this.compare(previousValue, newValue)) {
				newElements.push([this.ranges[i][0], newValue]);
				previousValue = newValue;
			}
		}

		if (Buffer.compare(this.ranges[endIndex][0], end) === 0) {
			if (this.compare(previousValue, this.ranges[endIndex][1])) {
				endIndex++;
			}
		} else {
			const endValue = this.merge(this.ranges[endIndex][1], value);

			if (!this.compare(endValue, this.ranges[endIndex][1])) {
				if (!this.compare(previousValue, endValue)) {
					newElements.push([this.ranges[endIndex][0], endValue]);
				}

				newElements.push([end, this.ranges[endIndex][1]]);
			} else if (!this.compare(previousValue, endValue)) {
				newElements.push([this.ranges[endIndex][0], endValue]);
			}

			endIndex++;
		}

		this.ranges.splice(startIndex, endIndex - startIndex, ...newElements);
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 * @returns {[Buffer, Buffer, T][]}
	 */
	getRanges(start, end) {
		if (Buffer.compare(start, end) >= 0) {
			return [];
		}

		const startIndex = this.ranges.findLastIndex(([key]) => Buffer.compare(start, key) >= 0);
		const endIndex = this.ranges.findLastIndex(([key]) => Buffer.compare(end, key) >= 0);

		assert(startIndex !== -1 && endIndex !== -1);

		if (startIndex === endIndex) {
			return [[
				start,
				end,
				this.ranges[startIndex][1]
			]];
		}

		/** @type {[Buffer, Buffer, T][]} */
		const ranges = [];

		for (let i = startIndex; i < endIndex; i++) {
			ranges.push([
				i === startIndex ? bufferMax(this.ranges[i][0], start) : this.ranges[i][0],
				this.ranges[i + 1][0],
				this.ranges[i][1]
			]);
		}

		if (Buffer.compare(end, this.ranges[endIndex][0]) !== 0) {
			ranges.push([
				this.ranges[endIndex][0],
				end,
				this.ranges[endIndex][1]
			]);
		}

		return ranges;
	}

	/**
	 * @param {Buffer} key
	 * @returns {T}
	 */
	get(key) {
		const entry = this.ranges.findLast(([entryKey]) => Buffer.compare(key, entryKey) >= 0);

		assert(entry);

		return entry[1];
	}

	/**
	 * @param {(entry: [Buffer, T]) => boolean} callback
	 * @returns {number}
	 */
	findIndex(callback) {
		const index = this.ranges.findLastIndex(callback);

		assert.notStrictEqual(index, -1);

		return index;
	}
}

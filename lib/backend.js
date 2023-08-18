// @ts-check

/**
 * @typedef {{ results: [Buffer, Buffer][], more: boolean }} KVList
 */

export default class Backend {
	/**
	 * @param {Buffer} key
	 * @returns {Promise<Buffer | undefined>}
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async get(key) {
		return undefined;
	}

	/**
	 * @param {Buffer} key
	 * @param {boolean} inclusive
	 * @param {number} offset
	 * @returns {Promise<Buffer>}
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async getKey(key, inclusive, offset) {
		return Buffer.allocUnsafe(0);
	}

	/**
	 * @param {Buffer} key
	 * @param {Buffer} value
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	set(key, value) {
	}

	/**
	 * @param {Buffer} key
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	clear(key) {
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
	 * @returns {Promise<KVList>}
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async getRange(start, startInclusive, startOffset, end, endInclusive, endOffset, reverse, limit) {
		return { more: false, results: [] };
	}

	/**
	 * @param {Buffer} start
	 * @param {Buffer} end
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	clearRange(start, end) {
	}
}

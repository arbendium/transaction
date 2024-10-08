// @ts-check

import assert from 'node:assert';
import { test } from 'node:test';
import GenericBackend from '../lib/backend.js';
import Transaction from '../lib/transaction.js';

const defaultState = {
	entry: undefined,
	promise: undefined,
	readConflict: false,
	writeConflict: false,
	mutations: undefined
};

/**
 * @typedef {(
 *   | ['get', number[], number[] | undefined]
 * )} Operation
 */

class Backend extends GenericBackend {
	/** @param {Operation[]} operations */
	constructor(operations) {
		super();

		/** @type {Operation[]} */
		this.operations = operations;
	}

	/**
	 * @override
	 * @param {Buffer} key
	 * @returns {Promise<Buffer | undefined>}
	 */
	async get(key) {
		const operation = this.operations.shift();

		assert.strictEqual(operation?.[0], 'get');
		assert.deepStrictEqual(operation[1], [...key]);

		if (operation[2] != null) {
			return Buffer.from(operation[2]);
		}
	}
}

/**
 * @param {[number[], Transaction['index']['ranges'][0][1]][]} cache
 * @param {Operation[]} operations
 * @returns {Transaction}
 */
function testTransaction(cache, operations) {
	const transaction = new Transaction();

	transaction.index.ranges = cache.map(([key, value]) => [Buffer.from(key), value]);
	transaction.backend = new Backend(operations);

	return transaction;
}

test('get - empty cache and no entry', async () => {
	const transaction = testTransaction(
		[[[], defaultState]],
		[['get', [123], undefined]]
	);

	const result = await transaction.get(Buffer.from([123]));

	assert.deepStrictEqual(result, undefined);
});

test('get - empty cache and existing entry', async () => {
	const transaction = testTransaction(
		[[[], defaultState]],
		[['get', [123], [223]]]
	);

	const result = await transaction.get(Buffer.from([123]));

	assert.deepStrictEqual(result, Buffer.from([223]));
});

test('get - promise in cache', async () => {
	const transaction = testTransaction(
		[[[], defaultState]],
		[['get', [123], [223]]]
	);

	transaction.get(Buffer.from([123]));
	const result = await transaction.get(Buffer.from([123]));

	assert.deepStrictEqual(result, Buffer.from([223]));
});

test('get - querying after non-dependent mutation - clear', async () => {
	const transaction = testTransaction(
		[[[], defaultState]],
		[]
	);

	transaction.clear(Buffer.from([123]));
	const result = await transaction.get(Buffer.from([123]));

	assert.deepStrictEqual(result, undefined);
});

test('get - querying after non-dependent mutation - set', async () => {
	const transaction = testTransaction(
		[[[], defaultState]],
		[]
	);

	transaction.set(Buffer.from([123]), Buffer.from([223]));
	const result = await transaction.get(Buffer.from([123]));

	assert.deepStrictEqual(result, Buffer.from([223]));
});

test('get - querying while mutating', async () => {
	const transaction = testTransaction(
		[[[], defaultState]],
		[['get', [123], [223]]]
	);

	const resultPromise = transaction.get(Buffer.from([123]));
	transaction.set(Buffer.from([123]), Buffer.from([221]));

	const result = await resultPromise;

	assert.deepStrictEqual(result, Buffer.from([223]));
});

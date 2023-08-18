import assert from 'assert';
// eslint-disable-next-line import/no-unresolved
import Tree, { beforeStart, afterEnd } from '@arbendium/tree';
import IntervalSet from './interval-set.js';

function updateState(tn, incomingTransaction, isSnapshot) {
	for (const [key, value] of incomingTransaction.state.entries()) {
		if (!tn.writes.contains(key)) {
			tn.state = tn.state.set(key, value);
		}
	}

	for (let i = 0; i < incomingTransaction.knownRanges.length; i++) {
		tn.knownRanges.add(incomingTransaction.knownRanges[i]);
	}

	if (!isSnapshot) {
		for (let i = 0; i < incomingTransaction.readConflictRanges.length; i++) {
			tn.readConflictRanges.add(incomingTransaction.readConflictRanges[i]);
		}
	}
}

export default class Transaction {
	blocking = Promise.resolve();

	constructor(compare, nextKey, populate) {
		this._compare = compare;
		this._nextKey = nextKey;
		this._populate = populate;
		this.state = new Tree(compare);
		this.knownRanges = new IntervalSet(compare);
		this.readConflictRanges = new IntervalSet(compare);
		this.writeConflictRanges = new IntervalSet(compare);
		this.writes = new IntervalSet(compare);
	}

	async commit() {
		return {
			knownRanges: this.knownRanges.intervals(),
			readConflictRanges: this.readConflictRanges.intervals(),
			state: this.state,
			writeConflictRanges: this.writeConflictRanges.intervals(),
			writes: this.writes.intervals()
		};
	}

	async get(key, isSnapshot = false) {
		if (!this.knownRanges.contains(key)) {
			if (this._populate == null) {
				return;
			}

			this.blocking = this.blocking
				.then(() => this._populate([key, this._nextKey(key)]))
				.then(incomingTransaction => updateState(this, incomingTransaction, isSnapshot));

			await this.blocking;
		}

		return this.state.get(key);
	}

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
		assert.strictEqual(startInclusive, false);
		assert.strictEqual(startOffset, 1);
		assert.strictEqual(endInclusive, false);
		assert.strictEqual(endOffset, 1);
		assert.strictEqual(targetBytes, 0);
		assert.strictEqual(iter, 1);

		const range = [start, end];

		const outersection = this.knownRanges.outersect([range]);

		if (outersection.length) {
			this.blocking = this.blocking
				.then(() => this._populate(range))
				.then(incomingTransaction => updateState(this, incomingTransaction, isSnapshot));

			await this.blocking;
		}

		const results = [...this.state.getRange(
			start,
			startInclusive,
			startOffset,
			end,
			endInclusive,
			endOffset,
			{ reverse, limit }
		)];

		return {
			more: false,
			results
		};
	}

	set(key, value) {
		const range = [key, this._nextKey(key)];

		this.writes.add(range);
		this.knownRanges.add(range);
		this.writeConflictRanges.add(range);

		this.state = this.state.set(key, value);
	}

	clear(key) {
		const range = [key, this._nextKey(key)];

		this.writes.add(range);
		this.knownRanges.add(range);
		this.writeConflictRanges.add(range);

		this.state = this.state.clear(key);
	}

	clearRange(start, end) {
		const range = [start, end];

		this.writes.add(range);
		this.knownRanges.add(range);
		this.writeConflictRanges.add(range);

		this.state = this.state.clearRange(start, end);
	}

	addWriteConflictRange(start, end) {
		if (end !== beforeStart
			&& start !== afterEnd
			&& (end === afterEnd || start === beforeStart || this._compare(start, end) < 0)) {
			this.writeConflictRnages.add([start, end]);
		}
	}

	addReadConflictRange(start, end) {
		if (end !== beforeStart
			&& start !== afterEnd
			&& (end === afterEnd || start === beforeStart || this._compare(start, end) < 0)) {
			this.readConflictRnages.add([start, end]);
		}
	}
}

import assert from 'assert';

export default class IntervalSet {
	_intervals = [];

	constructor(compare) {
		this._compare = compare;
	}

	contains(start) {
		if (arguments.length === 1) {
			return this._intervals.some(
				interval => this._compare(start, interval[0]) >= 0
					&& this._compare(start, interval[1]) < 0
			);
		}

		throw new Error('Not implemented');
	}

	intervals() {
		return rangeOutersect([], this._intervals, this._compare);
	}

	outersect(ranges) {
		return rangeOutersect(this._intervals, ranges, this._compare);
	}

	add(range) {
		this._intervals.push(range);
	}
}

function rangeOutersect(ranges1, ranges2, compare) {
	const list = [
		...ranges2.flatMap(([start, end]) => [[start, true, true], [end, true, false]]),
		...ranges1.flatMap(([start, end]) => [[start, false, true], [end, false, false]])
	];

	list.sort(([a], [b]) => compare(a, b));

	const ranges = [];
	let openRangeStart;
	let include = 0;
	let exclude = 0;

	for (const [point, inclusion, start] of list) {
		if (inclusion) {
			if (start) {
				include++;

				if (include === 1 && exclude === 0) {
					openRangeStart = point;
				}
			} else {
				include--;

				if (include === 0 && exclude === 0 && !openRangeStart.equals(point)) {
					ranges.push([openRangeStart, point]);
				}
			}
		} else if (start) {
			exclude++;

			if (exclude === 1 && include !== 0 && !openRangeStart.equals(point)) {
				ranges.push([openRangeStart, point]);
			}
		} else {
			exclude--;

			if (exclude === 0 && include !== 0) {
				openRangeStart = point;
			}
		}
	}

	assert.strictEqual(include, 0);
	assert.strictEqual(exclude, 0);

	return ranges;
}

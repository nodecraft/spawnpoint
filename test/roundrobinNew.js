'use strict';
const expect = require('unexpected');
const spawnpoint = require('..');
const app = new spawnpoint();
const _ = require('lodash');
const numbers = _.propertyOf({
	1: 'one',
	2: 'two',
	3: 'three',
	4: 'four',
	5: 'five'
});

describe('roundrobin', () => {
	const badOptions = ['', 10, false, true, {foo: 'bar'}, "five"];
	const testNumbersSorted = _.range(1, 5);
	const testNumbersUnsorted = _.shuffle(testNumbersSorted);
	const testStringsSorted = _.map(testNumbersSorted, numbers);
	const testStringsUnsorted = _.map(testNumbersUnsorted, numbers);
	const testSet = [testNumbersSorted, testNumbersUnsorted, testStringsSorted, testStringsUnsorted];

	it('fails with bad/invalid options', () => {
		const robin = require('../lib/roundRobin.js')(app);
		badOptions.forEach((item) => expect(() => robin(item), 'to error'));
	});

	it('Constructs the same way directly versus through Spawnpoint.', () => {
		const robin = require('../lib/roundRobin.js')(app);
		testSet.forEach((test) => {
			const appRR = app.roundRobin(test);
			const dirRR = new robin(test);
			expect(appRR, 'to exhaustively satisfy', dirRR);
		});
	});

	it('next() never calls the same value twice', () => {
		const robin = require('../lib/roundRobin.js')(app);
		testSet.forEach((test) => {
			const rr = new robin(test);

			let used = [];
			let i = 0;

			while(i++ < (test.length * 5)){
				const results = rr.next();
				expect(used, 'not to contain', results);
				used.push(results);

				if(used.length === test.length){
					used = [];
				}
			}
		});
	});

	it('item never gets the same value twice', () => {
		const robin = require('../lib/roundRobin.js')(app);
		testSet.forEach((test) => {
			const rr = new robin(test);

			let used = [];
			let i = 0;

			while(i++ < (test.length * 5)){
				const results = rr.item;
				expect(used, 'not to contain', results);
				used.push(results);

				if(used.length === test.length){
					used = [];
				}
			}
		});
	});
});
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import {PathMatcher as TestObj} from '../lib/matcher';

const expect = chai.expect;
const match = sinon.match;
chai.use(sinonChai);

describe('PathMatcher', () => {

	it('creates a regex from input path', () => {
		const matcher = new TestObj('/path/:a/record/:b');
		expect(matcher.regexp).to.be.a('RegExp');
		const regexpString = matcher.regexp.toString();
		expect(regexpString).to.contain('/^\\/path\\/((?:[^\\/]+?))\\/record\\/((?:[^\\/]+?))');
	});

	describe('.match()', () => {

		const testObj = new TestObj('/path/:a/record/:b');

		it('returns false if path is null', () => {
			const match = testObj.match(null, {});
			expect(match).to.equal(false);
		});

		it('returns false if no match found', () => {
			const match = testObj.match('/path', {});
			expect(match).to.equal(false);
		});

		it('returns true if match found', () => {
			const match = testObj.match('/path/one/record/5', {});
			expect(match).to.equal(true);
		});

		it('returns true if match found with trailing slash', () => {
			const match = testObj.match('/path/one/record/5/', {});
			expect(match).to.equal(true);
		});

		it('populates params if match found', () => {
			const params: any = {};
			const match = testObj.match('/path/one/record/5', params);
			expect(match).to.equal(true);
			expect(params).to.have.keys('a', 'b');
			expect(params.a).to.equal('one');
			expect(params.b).to.equal('5');
		});

		it('throws error when malformed param included in path', () => {
			const fnCall = () => testObj.match('/path/one/record/%E0%A4%A', {});
			expect(fnCall).to.throw(URIError);
		});
	});
});

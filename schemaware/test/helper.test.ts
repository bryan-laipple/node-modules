import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import {SchemawareHelper as TestObj, SchemawareRequest} from '../lib/helper';

const expect = chai.expect;
const match = sinon.match;
chai.use(sinonChai);

describe('SchemawareHelper', () => {

	describe('.combineSchemas()', () => {

		it('combines multiple schema objects into one', () => {
			const schemaA = {'pathA': 'valueA'};
			const schemaB = {'pathB': 'valueB'};
			const combined = TestObj.combineSchemas([schemaA, schemaB]);
			expect(combined).to.have.keys('pathA', 'pathB');
			expect(combined.pathA).to.equal('valueA');
			expect(combined.pathB).to.equal('valueB');
		});

		it('throws an error if paths in schemas are not unique', () => {
			const schemaA = {'pathA': 'valueA'};
			const schemaB = {'pathA': 'valueB'};
			const fnCall = () => TestObj.combineSchemas([schemaA, schemaB]);
			expect(fnCall).to.throw(Error, 'pathA');
		});
	});

	describe('.buildMatcherToPathMap()', () => {

		it('maps PathMatcher objects to path string', () => {
			const schema = {'path/:a': 'valueA'};
			const map = TestObj.buildMatcherToPathMap(schema);
			const values = Array.from(map.values());
			expect(values).to.be.lengthOf(1);
			expect(values).to.contain('path/:a');
		});

		it('throws an error if paths are indistinguishable', () => {
			const schema = {
				'path/:a': 'valueA',
				'path/:b': 'valueB'
			};
			const fnCall = () => TestObj.buildMatcherToPathMap(schema);
			expect(fnCall).to.throw(Error, 'indistinguishable');
		});
	});

	const postRecord = 'postRecordSchema';
	const getRecord = 'getRecordSchema';
	const deleteRecord = 'deleteRecordSchema';
	const postEvent = 'postEventSchema';
	const getEvent = 'getEventSchema';
	const putEvent = 'putEventSchema';
	const deleteEvent = 'deleteEventSchema';
	// using uppercase methods for this test schema
	const recordEndpoints = {
		'/record': {
			'POST': postRecord
		},
		'/record/:id': {
			'GET': getRecord, 'DELETE': deleteRecord
		}
	};
	// using lowercase methods for this test schema
	const eventEndpoints = {
		'/record/:recordId/event': {
			'post': postEvent
		},
		'/record/:recordId/event/:eventId': {
			'get': getEvent, 'put': putEvent, 'delete': deleteEvent
		},
	};

	describe('.matchPath()', () => {

		const testObj = new TestObj([recordEndpoints, eventEndpoints]);

		it('returns undefined if no match found', () => {
			const match = testObj.matchPath('/event/:eventId');
			expect(match).to.be.undefined;
		});

		it('returns SchemawareMatch if match is found', () => {
			const expressPath = '/record/:recordId/event/:eventId';
			const recordId = 'myRecord';
			const eventId = 'myEvent';
			const requestPath = `/record/${recordId}/event/${eventId}`;
			const match = testObj.matchPath(requestPath);
			expect(match.path).to.equal(expressPath);
			expect(match.params).to.have.keys('recordId', 'eventId');
			expect(match.params.recordId).to.equal(recordId);
			expect(match.params.eventId).to.equal(eventId);
		});
	});

	describe('.getSchemaByMethodAndExpressPath()', () => {

		const testObj = new TestObj([recordEndpoints, eventEndpoints]);

		it('returns undefined if path not in schema', () => {
			const schema = testObj.getSchemaByMethodAndExpressPath('get', '/event/:eventId');
			expect(schema).to.be.undefined;
		});

		it('returns undefined if method not in schema', () => {
			const schema = testObj.getSchemaByMethodAndExpressPath('put', '/record/:id');
			expect(schema).to.be.undefined;
		});

		it('ignores case of request method', () => {
			// input case of method name here is opposite from original input schemas
			const schema1 = testObj.getSchemaByMethodAndExpressPath('post', '/record');
			const schema2 = testObj.getSchemaByMethodAndExpressPath('POST', '/record/:recordId/event');
			expect(schema1).to.equal(postRecord);
			expect(schema2).to.equal(postEvent);
		});
	});

	describe('.getSchema()', () => {

		let mockRequest: SchemawareRequest;
		const testObj = new TestObj([recordEndpoints, eventEndpoints]);
		const getSchemaByMethodAndExpressPathStub = sinon.stub(testObj, 'getSchemaByMethodAndExpressPath');
		const matchPathStub = sinon.stub(testObj, 'matchPath');

		beforeEach(() => {
			mockRequest = <SchemawareRequest>{};
		});

		afterEach(() => {
			getSchemaByMethodAndExpressPathStub.reset();
			matchPathStub.reset();
		});

		it('returns undefined if no schema found', () => {
			const requestPath = 'someMockRequestPath';
			mockRequest.path = requestPath;
			matchPathStub.withArgs(requestPath).returns(null);
			const schema = testObj.getSchema(mockRequest);
			expect(matchPathStub).to.have.been.calledWith(requestPath);
			expect(schema).to.be.undefined;
		});

		it('returns schema for request method and path if found', () => {
			const requestMethod = 'get';
			const requestPath = 'someMockRequestPath';
			const expressPath = 'someMockExpressPath';
			const matchedParams = {'some': 'params'};
			const mockSchemawareMatch = {
				path: expressPath,
				params: matchedParams
			};
			const expectedSchema = 'expectedSchema';
			mockRequest.method = requestMethod;
			mockRequest.path = requestPath;
			mockRequest.params = {};
			matchPathStub.withArgs(requestPath).returns(mockSchemawareMatch);
			getSchemaByMethodAndExpressPathStub.withArgs(requestMethod, expressPath).returns(expectedSchema);

			const schema = testObj.getSchema(mockRequest);

			expect(matchPathStub).to.have.been.calledWith(requestPath);
			expect(getSchemaByMethodAndExpressPathStub).to.have.been.calledWith(requestMethod, expressPath);
			expect(schema).to.equal(expectedSchema);
		});

		it('sets params and saves match on request object', () => {
			const requestMethod = 'get';
			const requestPath = 'someMockRequestPath';
			const expressPath = 'someMockExpressPath';
			const matchedParams = {'some': 'params'};
			const mockSchemawareMatch = {
				path: expressPath,
				params: matchedParams
			};
			const expectedSchema = 'expectedSchema';
			mockRequest.method = requestMethod;
			mockRequest.path = requestPath;
			mockRequest.params = {};
			matchPathStub.withArgs(requestPath).returns(mockSchemawareMatch);
			getSchemaByMethodAndExpressPathStub.withArgs(requestMethod, expressPath).returns(expectedSchema);

			const schema = testObj.getSchema(mockRequest);

			expect(matchPathStub).to.have.been.calledWith(requestPath);
			expect(getSchemaByMethodAndExpressPathStub).to.have.been.calledWith(requestMethod, expressPath);
			expect(mockRequest.params).to.eql(matchedParams);
			expect(mockRequest.schemawareMatch).to.equal(mockSchemawareMatch);
		});

		it('does NOT re-search if match has been saved on request object', () => {
			const requestMethod = 'get';
			const expressPath = 'someMockExpressPath';
			const matchedParams = {'some': 'params'};
			const expectedSchema = 'expectedSchema';
			const mockSchemawareMatch = {
				path: expressPath,
				params: matchedParams,
				schema: expectedSchema
			};
			mockRequest.method = requestMethod;
			mockRequest.schemawareMatch = mockSchemawareMatch;
			mockRequest.params = {};

			const schema = testObj.getSchema(mockRequest);

			expect(matchPathStub).to.not.have.been.called;
			expect(getSchemaByMethodAndExpressPathStub).to.not.have.been.called;
			expect(schema).to.equal(expectedSchema);
		});
	});
});

import * as proxyquire from 'proxyquire';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import {Request, RequestHandler, Response} from 'express';

const expect = chai.expect;
const match = sinon.match;
chai.use(sinonChai);

const mockIsExpressSchemaValid = {'mocked': 'SchemaValidFn'};
const TestModule = proxyquire('../lib/schemaware', {'is-express-schema-valid': {default: mockIsExpressSchemaValid}});
const TestObj = TestModule.Schemaware;
const NotFoundError = TestModule.NotFoundError;

describe('Schemaware', () => {

	const testObj = new TestObj({});

	describe('.customRequestHandler()', () => {

		let handler: RequestHandler;
		const mockEndpointSchema = {'mock': 'schema'};
		const mockRequest = <Request>{};
		const mockResponse = <Response>{};
		const nextStub = sinon.stub();
		const middlewareGeneratoreStub = sinon.stub();
		const getSchemaStub = sinon.stub(testObj.helper, 'getSchema');

		beforeEach(() => {
			handler = testObj.customRequestHandler(middlewareGeneratoreStub);
		});

		afterEach(() => {
			getSchemaStub.reset();
			middlewareGeneratoreStub.reset();
			nextStub.reset();
		});

		it('sends NotFoundError to NextFunction when no schema found', () => {
			getSchemaStub.withArgs(match.same(mockRequest)).returns(null);

			handler(mockRequest, mockResponse, nextStub);

			expect(nextStub).to.have.been.calledWith(match.instanceOf(NotFoundError));
		});

		it('uses middlewareGenerator to create a middleware function', () => {
			getSchemaStub.withArgs(match.same(mockRequest)).returns(mockEndpointSchema);

			handler(mockRequest, mockResponse, nextStub);

			expect(middlewareGeneratoreStub).to.have.been.calledWith(match.same(mockEndpointSchema));
		});

		it('passes options to middlewareGenerator when provided', () => {
			const options = 'some options';
			handler = testObj.customRequestHandler(middlewareGeneratoreStub, options);
			getSchemaStub.withArgs(match.same(mockRequest)).returns(mockEndpointSchema);

			handler(mockRequest, mockResponse, nextStub);

			expect(middlewareGeneratoreStub).to.have.been.calledWith(match.same(mockEndpointSchema), match.same(options));
		});

		it('invokes a middleware function if created', () => {
			const middlewareStub = sinon.stub();
			getSchemaStub.withArgs(match.same(mockRequest)).returns(mockEndpointSchema);
			middlewareGeneratoreStub.withArgs(match.same(mockEndpointSchema)).returns(middlewareStub);

			handler(mockRequest, mockResponse, nextStub);

			expect(middlewareStub).to.have.been.calledWith(
				match.same(mockRequest),
				match.same(mockResponse),
				match.same(nextStub)
			);
			expect(nextStub).to.not.have.been.called;
		});

		it('invokes NextFunction if no middleware created', () => {
			getSchemaStub.withArgs(match.same(mockRequest)).returns(mockEndpointSchema);
			middlewareGeneratoreStub.withArgs(match.same(mockEndpointSchema)).returns(null);

			handler(mockRequest, mockResponse, nextStub);

			expect(nextStub).to.have.been.called;
		});
	});

	describe('.requestValidator()', () => {
		let customRequestHandlerStub: any;

		beforeEach(() => {
			customRequestHandlerStub = sinon.stub(testObj, 'customRequestHandler');
		});

		afterEach(() => {
			customRequestHandlerStub.restore();
		});

		it('uses isExpressSchemaValid as input to customRequestHandler()', () => {
			const expected = 'expected return';
			customRequestHandlerStub.withArgs(match.same(mockIsExpressSchemaValid)).returns(expected);

			const actual = testObj.requestValidator();

			expect(actual).to.equal(expected);
			expect(customRequestHandlerStub).to.be.calledWith(match.same(mockIsExpressSchemaValid));
		});

		it('passes options to customRequestHandler()', () => {
			const expected = 'expected return';
			const options = 'some options';
			customRequestHandlerStub.withArgs(match.same(mockIsExpressSchemaValid), match.same(options)).returns(expected);

			const actual = testObj.requestValidator(options);

			expect(actual).to.equal(expected);
			expect(customRequestHandlerStub).to.be.calledWith(match.same(mockIsExpressSchemaValid), match.same(options));
		});
	});
});

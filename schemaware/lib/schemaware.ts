import {Request, RequestHandler, Response, NextFunction} from 'express';
import {SchemawareHelper, SchemawareRequest} from './helper';
const isExpressSchemaValid = require('is-express-schema-valid').default;

const debug = require('debug')('schemaware');

// isExpressSchemaValid will throw SchemaValidationError type, need to export it
export const SchemaValidationError = isExpressSchemaValid.SchemaValidationError;

export class NotFoundError implements Error {
	public name: string;
	public message: string;
}

export type MiddlewareFromSchemaFn = (schema: any, options?: any) => RequestHandler;

export class Schemaware {
	public helper: SchemawareHelper;

	public constructor(...schemas: any[]) {
		this.helper = new SchemawareHelper(schemas);
	}

	public customRequestHandler(middlewareGenerator: MiddlewareFromSchemaFn, options?: any): RequestHandler {
		return (req: Request, res: Response, next: NextFunction): void => {
			const endpointSchema = this.helper.getSchema(req as SchemawareRequest);
			if (!endpointSchema) {
				return next(new NotFoundError());
			}
			debug(`schema found for '${req.path}': ${JSON.stringify(endpointSchema, null, 2)}`);
			const middleware = middlewareGenerator(endpointSchema, options);
			if (!middleware) {
				debug(`no middleware for ${middlewareGenerator.name}`);
				return next();
			}
			return middleware(req, res, next);
		};
	}

	public requestValidator(options?: any): RequestHandler {
		return this.customRequestHandler(isExpressSchemaValid, options);
	}
}

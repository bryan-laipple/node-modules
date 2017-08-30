import {Request} from 'express';
import {PathMatcher} from './matcher';

const debug = require('debug')('schemaware');

export type SchemawareMatch = {
	path: string,
	params: any,
	schema?: any
};

export interface SchemawareRequest extends Request {
	schemawareMatch?: SchemawareMatch;
}

// Internal class so we don't need to expose everything in the index.ts
export class SchemawareHelper {
	public schema: any;
	public matcherToPathMap: Map<PathMatcher, string>;

	public static combineSchemas(schemas: any[]): any {
		const combined: any = {};
		schemas.forEach(schema => {
			Object.keys(schema).forEach(key => {
				if (!combined[key]) {
					combined[key] = schema[key];
				} else {
					throw new Error(`'${key}' found more than once in schema(s).`);
				}
			});
		});
		return combined;
	}

	public static buildMatcherToPathMap(schema: any): Map<PathMatcher, string> {
		const collisionCheck = new Map<string, string>();
		const map = new Map<PathMatcher, string>();
		Object.keys(schema).forEach(path => {
			const matcher = new PathMatcher(path);
			if (collisionCheck.has(`${matcher.regexp}`)) {
				const collisionRegEx = `${matcher.regexp}`;
				throw new Error(`'${path}' indistinguishable from '${collisionCheck.get(collisionRegEx)}'`);
			}
			map.set(matcher, path);
			collisionCheck.set(`${matcher.regexp}`, path);
		});
		return map;
	}

	public constructor(schemas: any[]) {
		// Using Object.assign() doesn't allow a check for collisions
		// we want to alert the caller that if a schema from one file would override another
		this.schema = SchemawareHelper.combineSchemas(schemas);
		this.matcherToPathMap = SchemawareHelper.buildMatcherToPathMap(this.schema);
	}

	public matchPath(requestPath: string): SchemawareMatch {
		let path: string;
		const params: any = {};
		for (let matcherAndPath of this.matcherToPathMap) {
			const matcher = matcherAndPath[0];
			if (matcher.match(requestPath, params)) {
				path = matcherAndPath[1];
				break;
			}
		}
		if (path) {
			debug(`path found = ${path}`);
			return {path: path, params: params};
		}
		debug(`no path found for = ${requestPath}`);
	}

	public getSchemaByMethodAndExpressPath(method: string, expressPath: string): any {
		const pathSchema = this.schema[expressPath];
		let schema: any;
		if (pathSchema) {
			schema = pathSchema[method.toUpperCase()]
				|| pathSchema[method.toLowerCase()];
		}
		if (schema) {
			return schema;
		}
		debug(`no schema found for endpoint: '${method} ${expressPath}'`);
	}

	public getSchema(req: SchemawareRequest): any {
		if (req.schemawareMatch) {
			Object.assign(req.params, req.schemawareMatch.params);
			return req.schemawareMatch.schema;
		}
		const match = this.matchPath(req.path);
		if (match) {
			match.schema = this.getSchemaByMethodAndExpressPath(req.method, match.path);
			// save match info on request object for use by another schemaware fn in the chain
			req.schemawareMatch = match;

			Object.assign(req.params, match.params);
			return match.schema;
		}
	}
}

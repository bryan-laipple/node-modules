import * as pathToRegexp from 'path-to-regexp';

const hasOwnProperty = Object.prototype.hasOwnProperty;

const decode_param = (val: any) => {
	if (typeof val !== 'string' || val.length === 0) {
		return val;
	}
	try {
		return decodeURIComponent(val);
	} catch (err) {
		if (err instanceof URIError) {
			err.message = `Failed to decode param '${val}'`;
		}
		throw err;
	}
};

// This provides similar matching as in express/lib/router/layer
export class PathMatcher {
	public regexp: pathToRegexp.PathRegExp;

	public constructor(schemaPath: string) {
		this.regexp = pathToRegexp(schemaPath);
	}

	public match(requestPath: string, params: any): boolean {
		let match;
		if (!!requestPath) {
			// match the path
			match = this.regexp.exec(requestPath);
		}
		if (!match) {
			return false;
		}

		// set params based on keys in regexp
		const keys = this.regexp.keys;
		for (let i = 1; i < match.length; i++) {
			const key = keys[i - 1];
			const prop = key.name;
			const val = decode_param(match[i]);
			if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
				params[prop] = val;
			}
		}
		return true;
	}
}

# Schemaware
Schemaware is a general purpose ExpressJS Middleware Configuration Framework.  It provides the ability to add router-level middleware (`router.use` or `router.METHOD`) at the application-level (`app.use`).  Configuration is accomplished using schema objects.  Since the schema can be defined in JSON files, the configuration is easy to maintain and self-documenting.

_*NOTE:*_ The terms "schema", "schema object", "configuration", "endpoint configuration" are used a bit recklessly throughout this document and often interchangeably. Any confusion is mostly to blame on the ramblings of the author and the fact this is a first pass.  In the future, feedback (and Pull Requests) are very much welcome to make the wording more clear.

Another point of clarity to call out is that the ExpressJS terms "middleware" and "request handler" as well as the type "RequestHandler" are used interchangeably since they do refer to the same thing (at least from the author's perspective).

Here is a link to [ExpressJS documentation](https://expressjs.com/)
### Installation and Setup
This section provides a quick overview of the basic steps for installation and setup of the Schemaware package.  See the following sections for more details on [defining schemas](#defining-schemas), [error handling](#handling-errors), [built-in](#built-in-request-handlers) and [custom](#creating-custom-request-handlers) request handlers.

1. Install with NPM:
```
npm install --save @<my-private-repo>/schemaware
```
2. Import the Schemaware constructor as well as necessary Error types (for use in error-handling middleware):
```
import {Schemaware, NotFoundError, SchemaValidationError} from '@<my-private-repo>/schemaware';
```
or
```
const SchemawareExports = require('@<my-private-repo>/schemaware');
const Schemaware = SchemawareExports.Schemaware;
const NotFoundError = SchemawareExports.NotFoundError;
const SchemaValidationError = SchemawareExports.SchemaValidationError;
```
3. Create a schema for _*each*_ endpoint. _**If a schema object is not found for a particular request, the `NotFoundError` is passed to the ExpressJS NextFunction**_. For example:
```
{
  "/record": {
    "post": <schema object>
  },
  "/record/:id": {
    "get": <schema object>,
    "put": <schema object>,
    "delete": <schema object>
  }
}
```
4. Pass all schemas to the Schemaware constructor:
```
const schemaware = new Schemaware(require('./v1Schema.json'), require('./v2Schema.json'));
```
5. Register the desired built-in and/or custom request handlers with the ExpressJS application or router object's `use` method:
```
app.use(schemaware.customRequestHandler(<my custom MiddlewareGenerator>));
app.use(schemaware.requestValidator(options));
```
### Defining Schemas
Defining a schema here simply refers to configuring the API through JSON.  Although the Schemaware constructor accepts JavaScript objects, maintainence and readability of the configuration is easily accomplished in one or many JSON files.  Since schemas are designed to be fully customizable to the users needs, there are only a few restrictions currently:
1. The schema objects are limited to the same limitations as JSON in terms of expressing JavaScript objects.
2. There should be a single entry for each ExpressJS path.  For instance, the schema objects for the endpoints `GET /record/:id` and `PUT /record/:id` need to exist in the same file and under the same path name (`/record/:id`).
3. Each request that your ExpressJS application handles needs to include a schema entry. _**If a schema object is not found for a particular request, the `NotFoundError` is passed to the ExpressJS NextFunction**_.

### Built-in Request Handlers
Schemaware comes with built-in request handlers that expect certain name/value pairs to be present in the schema object.

Pull Requests welcome to grow this library of built-in request handlers.

#### Request Validator
The built-in request validator can be accessed using the `requestValidator(options)` method of a Schemaware instance. This is a wrapper for the [**is-express-schema-valid**](https://github.com/voronianski/is-express-schema-valid) npm package which uses a standard, known as the [JSON Schema specification,](http://json-schema.org/) to configure the validation logic for request path, query and payload.  The links to the original package, the specification, as well as the [JSON Schema Validation](http://json-schema.org/latest/json-schema-validation.html) can be used for a more detailed understanding of the possible validation configurations that can be used.  Here an example configuration:
```
  "/record": {
    "post": {
      "payload": {
        "name": {
          "type": "string",
          "required": true,
          "minLength": 3
        },
        "email": {
          "type": "string",
          "required": true,
          "format": "email"
        },
        "nickname": {
          "type": "string",
          "required": false,
          "minLength": 1
        }
      }
    }
  },
  "/record/:id": {
    "get": {
      "params": {
        "id": {
          "type": "string",
          "required": true,
          "format": "uuid"
        }
      }
    }
```
The above example defines a schema object for a GET and a POST request.  The POST requires a `name` and `email`, but also accepts an optional `nickname` in the request body.  All must be strings and the `email` must match the email format from the JSON Schema Validation specification.  The `name` and `nickname` also have minimum length restrictions.  The GET requires the `:id` path parameter to be a UUID.

If validation fails, a `SchemaValidationError` will be passed to the ExpressJS NextFunction for any error-handling middleware to use. An instance of `SchemaValidationError` will contain detailed information of validation errors.  This information is accessible from the `errors` property on the Error object.  The `errors` property does not include any sensitive data from the request so it is safe to include in a 4xx response. 

### Creating Custom Request Handlers
No framework can call itself one unless it is extensible.  A user can register their own middleware and corresponding configuration easily with Schemaware.  Some level of understanding of ExpressJS middleware is necessary for creating custom request handlers. See the [ExpressJS writing middleware documentation](https://expressjs.com/en/guide/writing-middleware.html) for more information.

Below is a small and simple, and hopefully realistic, example to help communicate the steps to create your own request handler with Schemaware.

#### Logging Example
For this example let us assume we have different logging requirements for different types of requests.  Access to certain data might be highly sensitive or we may want to send creation or deletion requests to a notification system.  With ExpressJS a developer may need to register different request handlers spread across different `router.METHOD` calls.  Schemaware allows us to register it once and configure it with JSON.

First we'll need to add our configuration information to the applicable schema objects.
```
...
  "/record": {
    "post": {
      ...
      "loggingConfig": {<some config data>}
    }
  },
  "/record/:id": {
    "get": {
      ...
    },
    "delete": {
      ...
      "loggingConfig": {<some config data>}
    }
  }
...
```
The `loggingConfig` object (which we just made up) would have some additional details that would be used by our middleware, but the take away here is that we've just added a custom entry throughout our schema file(s) where desired.  Notice it was not added to the GET method.

Next, we'll need to create a "MiddlewareGenerator" function to pass to the `customRequestHandler()` method of our Schemaware instance.  The MiddlewareGenerator function accepts a schema object and optional options object as input.  If there is desired logic to be executed based on the configuration, then it can return a RequestHandler function.  Otherwise, it need not return anything.  As with any other custom ExpressJS middleware, **do not forget to call the NextFunction** when appropriate.
```
const configuredLogger = (schema, options) => {
    if (schema.loggingConfig) {
        return (req, res, next) => {
            if (schema.loggingConfig.location) {
               // point logging output to specified location
            }
            if (schema.loggingConfig.sensitive) {
                // some sensitive logging here
            } else {
                // default behavior based on existence of loggingConfig presence
            }
            return next();
        };
    }
};
```
Then add the functionality to the middleware chain.
```
router.use(schemaware.customRequestHandler(configuredLogger, options));
```
Let's take a closer look at the `configuredLogger` function.  First it accepts a schema object as input so we can interrogate it during processing of the request.  It also accepts an optional options object that can be used to further customize the middleware generated when processing a request. In our case, the functionality depends on the `loggingConfig` propery being present.  Based on the example JSON above, we can see that when our server receives a request for `GET /record/1234`, the `configuredLogger` function will not return any middleware since there is nothing to do.  However, for a request to `POST /record` or `DELETE /record/456`, a request handler will be returned and executed.

The RequestHandler function that is returned has a few branches based on the particular values of the `loggingConfig` object.  If `location` is present (again we are just making up our own configuration here), then our middleware could point to a special file for this logging.  If the `sensitive` flag is set, then we'll log differently than the default behavior.  Since our returned middleware doesn't respond to (or end) the request, it calls the NextFunction as the last order of business.

### Handling Errors
ExpressJS provides the ability to register error-handling middleware functions.  These should be defined last, after other `app.use()` and routes calls.  Adding any Schemaware request handler to the application should be accompanied by logic to handle the `NotFoundError` that is used to indicate a schema object could not be found for a particular request.  Additionally, any built-in or custom Schemaware request handlers used may require handling of errors in an error-handling middleware function.  Here is an example of an error handler for the `NotFoundError` and `SchemaValidationError`:
```
const errorHandler = (err, req, res, next) => {
    if (err instanceof SchemaValidationError) {
        res.status(400).send(err.errors);
    }
    if (err instanceof NotFoundError) {
        res.status(404).send('Not Found')
    }
};
```
See the [ExpressJS error handling documentation](https://expressjs.com/en/guide/error-handling.html) for more information on handling errors during request processing.


'use strict';


const express = require('express');
const bodyParser = require('body-parser');
const Schemaware = require('./dist/schemaware').Schemaware;
const SchemaValidationError = require('./dist/schemaware').SchemaValidationError;
const httpPort = 3000;

// TODO fix relative path issue (relative to here vs relative to dist/schemaware)
const schemaware = new Schemaware(require('./apiSchema.json'));
const app = express();
const router = express.Router();

const logRequest = (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    return next();
};

const errorHandler = (err, req, res, next) => {
    if (err instanceof SchemaValidationError) {
        res.status(400).send(err.errors);
    }
};

// example custom handler that could be used to toggle an endpoint off
const featureToggleChecker = (schema) => {
    if (schema.featureToggleCheck) {
        return (req, res, next) => {
            console.log(`Checking feature toggles for '${schema.featureToggleCheck.name}'`);
            return next();
        };
    }
};

router.use(schemaware.customRequestHandler(featureToggleChecker));
router.use(schemaware.requestValidator());
router.post('/record', (req, res) => {
    console.log(`creating new record: ${JSON.stringify(req.body, null ,2)}`);
    res.status(201).send('Created');
});
router.put('/record/:id', (req, res) => {
    console.log(`updating record ${req.params.id}: ${JSON.stringify(req.body, null ,2)}`);
    res.status(202).send('Accepted');
});
router.get('/record/:id', (req, res) => {
    console.log(`fetching ${req.params.id}`);
    console.log(`query params = ${JSON.stringify(req.query, null, 2)}`);
    res.status(200).send('Ok');
});
router.delete('/record/:id', (req, res) => {
    console.log(`deleting record ${req.params.id}`);
    res.status(204).send('No Content');
});

app.use(bodyParser.json());
app.use(logRequest);
app.use(router);
app.use(errorHandler);
app.listen(httpPort, function () {
    console.log(`Listening on port ${httpPort}`);
});
'use strict';

// start the server
const server = process.env.SERVER_TO_TEST || 'server';
require(`./${server}`);

const request = require('supertest')('http://localhost:3000');
const uuidV4 = require('uuid/v4');

describe('API schema validation', function() {

    describe('creating record', function() {
        it('should return 400 if missing required payload property', function() {
            return request
                .post(`/record`)
                .send({
                    name: 'name'
                })
                .expect(400)
                .then(res => {
                    console.log(res.body);
                });
        });
        it('should return 400 if payload property invalid', function() {
            return request
                .post(`/record`)
                .send({
                    name: 'name',
                    email: 'emailnotvalid'
                })
                .expect(400)
                .then(res => {
                    console.log(res.body);
                });
        });
        it('should return 201 if valid request', function() {
            return request
                .post(`/record`)
                .send({
                    name: 'name',
                    email: 'valid@email.com',
                    nickname: 'nickname'
                })
                .expect(201);
        });
    });

    describe('updating record', function() {
        it('should return 400 if path param invalid (:id is not UUID)', function() {
            return request
                .put(`/record/123`)
                .expect(400)
                .then(res => {
                    console.log(res.body);
                });
        });
        it('should return 400 if payload invalid', function() {
            return request
                .put(`/record/${uuidV4()}`)
                .send({
                    email: 'notvalid'
                })
                .expect(400)
                .then(res => {
                    console.log(res.body);
                });
        });
        it('should return 202 if path params and payload valid', function() {
            return request
                .put(`/record/${uuidV4()}`)
                .send({
                    name: 'new name'
                })
                .expect(202)
                .catch(err => {
                    console.error(err);
                });
        });
    });

    describe('fetching record', function() {
        it('should return 400 if :id is not UUID', function() {
            return request
                .get(`/record/123`)
                .expect(400)
                .then(res => {
                    console.log(res.body);
                });
        });
        it('should return 200 if :id is a UUID', function() {
            return request
                .get(`/record/${uuidV4()}`)
                .query({query: 5})
                .expect(200)
                .catch(err => {
                    console.error(err);
                });
        });
    });

    describe('deleting record', function() {
        it('should return 400 if :id is not UUID', function() {
            return request
                .delete(`/record/123`)
                .expect(400)
                .then(res => {
                    console.log(res.body);
                });
        });
        it('should return 204 if :id is a UUID', function() {
            return request
                .delete(`/record/${uuidV4()}`)
                .expect(204)
                .catch(err => {
                    console.error(err);
                });
        });
    });
});
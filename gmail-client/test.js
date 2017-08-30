'use strict';

const proxyquire = require('proxyquire');
const expect = require('chai').expect;

class StubImapClientClass {
    constructor(host, port, options) {
        this.email;
        this.logLevel;
        console.log('in stub class constructor');
    }
}

const TestModule = proxyquire('./index', {'emailjs-imap-client': StubImapClientClass});

describe('Gmail Client', () => {
    // TODO add unit tests (possibly change GmailClient constructor to use DI rather than inheritance to more easily stub/spy IMAP client
    const client = new TestModule.GmailClient('address', 'password');
});
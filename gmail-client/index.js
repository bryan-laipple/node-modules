'use strict';

const ImapClient = require('emailjs-imap-client');
const MailParser = require('mailparser').MailParser;

const byUid = {byUid:true};

const theDayBeforeYesterday = () => {
    let d = new Date();
    d.setDate(d.getDate() - 2);
    return d;
};

const parseEmail = (email) => {
    return new Promise((resolve,reject) => {
        let parser = new MailParser({defaultCharset:'iso-8859-1'});
        parser.on('end', mailObject => {
            resolve(mailObject);
        });
        parser.write(email);
        parser.end();
    });
};

const uniquifyEmail = (email, id) => {
    id = id || Date.now().valueOf();
    let label;
    if (email.indexOf('+') > -1) {
        label = `${id}@`;
    } else {
        label = `+${id}@`;
    }
    return email.replace('@', label);
};

//
// In order for this client to access a gmail account two settings are required:
// - Enable IMAP (in settings under 'Forwarding and POP/IMAP')
// - Set 'Allow Less Secure Apps' to ON (https://myaccount.google.com/u/2/security?pli=1#connectedapps)
//
class GmailClient extends ImapClient {
    constructor(email, password) {
        let options = {
            auth: {
                user: email,
                pass: password
            },
            useSecureTransport: true,
            requireTLS: true
        };
        super('imap.gmail.com', 993, options);
        this.email = email;

        // overriding logLevel since it defaults to LOG_LEVEL_ALL
        this.logLevel = this.LOG_LEVEL_WARN;
    }

    // see https://www.npmjs.com/package/mailparser for list of parsed message object properties
    getMessagesWithSubject(subject, deliveredTo) {
        deliveredTo = deliveredTo || this.email;
        return this.search('INBOX', {all: [{header: ['delivered-to', deliveredTo]}, {header: ['subject', subject]}]})
            .then(ids => {
                if (ids.length > 0) {
                    return this.listMessagesForIds(ids);
                } else {
                    throw new Error(`no messages to ${this.email} with subject: '${subject}'`);
                }
            });
    }

    getMessagesFromAddress(from, deliveredTo) {
        deliveredTo = deliveredTo || this.email;
        return this.search('INBOX', {all: [{header: ['delivered-to', deliveredTo]}, {header: ['from', from]}]})
            .then(ids => {
                if (ids.length > 0) {
                    return this.listMessagesForIds(ids);
                } else {
                    throw new Error(`no messages to ${this.email} from: '${from}'`);
                }
            });
    }

    listMessagesForIds(messageIds) {
        return this.listMessages('INBOX', messageIds.join(), ['body[]'])
            .then(messages => {
                let asyncParsing = [];
                messages.forEach(msg => {
                    asyncParsing.push(parseEmail(msg['body[]']));
                });
                return Promise.all(asyncParsing);
            });
    }

    // Here for debugging, don't use on a large inbox
    // getAllMessages() {
    //     return this.listMessages('INBOX', '*', ['body[]'])
    //         .then(messages => {
    //             let asyncParsing = [];
    //             messages.forEach(msg => {
    //                 asyncParsing.push(parseEmail(msg['body[]']));
    //             });
    //             return Promise.all(asyncParsing);
    //         })
    // }

    deleteOldMessages(receivedBeforeDate) {
        let date = receivedBeforeDate || theDayBeforeYesterday();
        return this.search('INBOX', {before: [date]}, byUid)
            .then(uids => {
                if (uids.length > 0) {
                    return this.deleteMessages('INBOX', uids.join(), byUid);
                } else {
                    return Promise.resolve();
                }
            });
    }

}

exports.GmailClient = GmailClient;
exports.uniquifyEmail = uniquifyEmail;

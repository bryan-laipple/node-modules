# GmailClient
The GmailClient package provides a simple class that can be used fetch messages from a Gmail account inbox using an IMAP client.
```
npm install @<my-private-repo>/gmail-client
```
Create a client object by passing an email address and password to the constructor:
```
const GmailClient = require('@<my-private-repo>/gmail-client').GmailClient;
const client = new GmailClient(address, password);
```

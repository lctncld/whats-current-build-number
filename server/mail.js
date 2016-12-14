(function() {
  'use strict';

  const EventEmitter = require('events').EventEmitter;
  const inspect = require('util').inspect;
  const Imap = require('imap');

  const MAIL_CONFIG = process.env.NB_BUILD_NUMBER_APP_MAIL_CONFIG
    && process.env.NB_BUILD_NUMBER_APP_MAIL_CONFIG.split(':');
  if (!MAIL_CONFIG) throw new Error('Set NB_BUILD_NUMBER_APP_MAIL_CONFIG variable!');

  const controller = new EventEmitter();
  const connection = new Imap({
    user: MAIL_CONFIG[0],
    password: MAIL_CONFIG[1],
    host: MAIL_CONFIG[2],
    port: MAIL_CONFIG[3],
    tls: true
  });

  function openInbox(callback) {
    connection.openBox('INBOX', true, callback);
  }

  connection.once('ready', function() {
    openInbox((err, box) => {});
  });

  connection.on('error', function(err) {
    console.error(err);
  });

  connection.on('end', function() {
    console.log('Connection closed');
  });

  connection.on('mail', function(newMessageCount) {
    console.log(`${newMessageCount} new messages`);

    openInbox((err, box) => {
      if (err) throw err;
      let messageCount = box.messages.total;

      let threshold = (messageCount === newMessageCount) ? 1 : messageCount - newMessageCount;
      //TODO need to fetch last X messages at start and newMessageCount messages on subsequent invocations

      let fetch = connection.seq.fetch(`${messageCount}:${threshold}`, {
        bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)',
        struct: true
      });
      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          let body = '';
          stream.on('data', chunk => body += chunk.toString('utf8'));
          stream.on('end', () => {
            let entry = mailHeaderToAppEntry(body);
            controller.emit('message', entry);
          });
        });
      });
    });

  });

  connection.connect();

  function mailHeaderToAppEntry(input) {
    let header = Imap.parseHeader(input);
    console.log(`[connection.on:mail][fetch.on:message][message.on:body] ${inspect(header)}`);

    const subject = header.subject[0].trim();
    const regex = /(.*)(\sver.\s)(.*)/; //TODO
    const app = subject.replace(regex, '$1').replace('FW: ', '');
    const ver = subject.replace(regex, '$3').replace('FW: ', '');

    if (!app || !ver) {
      console.info(`${app}:${ver} is not a valid application info`);
      return;
    }

    return {
      app: app,
      version: ver,
      date: new Date(header.date[0])
    };
  }

  module.exports = controller;

})();
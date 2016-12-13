(function() {
  'use strict';

  const EventEmitter = require('events').EventEmitter;
  const Imap = require('imap');

  const MAIL_CONFIG = process.env.NB_BUILD_NUMBER_APP_MAIL_CONFIG
    && process.env.NB_BUILD_NUMBER_APP_MAIL_CONFIG.split(':');
  if (!MAIL_CONFIG) throw new Error('Set NB_BUILD_NUMBER_APP_MAIL_CONFIG variable!');

  const controller = new EventEmitter();
  const imap = new Imap({
    user: MAIL_CONFIG[0],
    password: MAIL_CONFIG[1],
    host: MAIL_CONFIG[2],
    port: MAIL_CONFIG[3],
    tls: true
  });

  imap.once('ready', function() {
    imap.openBox('INBOX', true, (err, box) => {
      if (err) throw err;

      let msgs = imap.seq.fetch('1:10', {
        bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)',
        struct: true
      });

      msgs.on('message', function(msg) {

        msg.on('body', function(stream, info) {
          var buffer = '';
          stream.on('data', function(chunk) {
            buffer += chunk.toString('utf8');
          });

          stream.once('end', function() {
            if (info.which !== 'TEXT') {
              const headers = Imap.parseHeader(buffer);
              controller.emit('message', {
                date: headers.date[0].trim(),
                subject: headers.subject[0].trim()
              });
            }

          });

        });

      });

    });
  });

  imap.once('error', function(err) {
    console.log(err);
  });

  imap.once('end', function() {
    console.log('Connection ended');
  });

  imap.connect();

  module.exports = controller;

})();
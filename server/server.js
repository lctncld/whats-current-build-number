const PORT = 4000;
const STATIC_FILE_DIR = __dirname + '/../static';

const http = require('http');
const Imap = require('imap');
const Rx = require('rx');
const fs = require('fs');
const path = require('path');

const server = http.createServer().listen(PORT);
server.on('request', function(request, response) {
  let requestPath = request.url;
  if (requestPath === '/version' && request.method === 'GET') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(versions));
  } else {
    response.setHeader('Content-Type', 'text/html');
    if (requestPath === '/') requestPath = '/index.html';
    const fsPath = STATIC_FILE_DIR + path.normalize(requestPath);
    const fsStream = fs.createReadStream(fsPath);
    fsStream.on('error', e => {
      console.warn(e);
      response.writeHead(404);
      response.end()
    });
    fsStream.pipe(response);
  }

});

let mails = new Rx.Subject();
let versions = [];

mails.subscribe(
  mail => {
    console.log('mail', mail);
    const subject = mail.subject;

    const app = subject
      .split(/(.*)(ver.)(.*)/)
      .filter(e => e && !(/ver./).test(e))
      .map(e => e.trim());
    if (app.length !== 2) return;
    versions.push({
      app: app[0],
      version: app[1],
      date: new Date(mail.date)
    });

  },
  err => console.error(err),
  () => console.info('completed')
);

const mailConfig = process.env.NB_BUILD_NUMBER_APP_MAIL_CONFIG
  && process.env.NB_BUILD_NUMBER_APP_MAIL_CONFIG.split(':');
if (!mailConfig) throw new Error('Set NB_BUILD_NUMBER_APP_MAIL_CONFIG variable!');

const imap = new Imap({
  user: mailConfig[0],
  password: mailConfig[1],
  host: mailConfig[2],
  port: mailConfig[3],
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
            mails.onNext({
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

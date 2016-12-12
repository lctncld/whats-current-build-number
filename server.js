const PORT = 4000;
const STATIC_FILE_DIR = __dirname + '/static';

const http = require('http');
const Imap = require('imap');
const inspect = require('util').inspect;
const Rx = require('rx');
const url = require('url');
const fs = require('fs');
const path = require('path');

const server = http.createServer().listen(PORT);
server.on('request', function(request, response) {
  var requestPath = url.parse(request.url).path;
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
let versions = {};

mails.subscribe(
  mail => {
    console.log('mail', mail);
    const subject = mail.subject;

    const app = subject
      .split(/(.*)(ver.)(.*)/)
      .filter(e => e && !(/ver./).test(e))
      .map(e => e.trim());
    if (app.length !== 2) return;
    versions[app[0]] = app[1];

  },
  err => console.error(err),
  () => console.info('completed')
);

const imap = new Imap({
  user: 'marketplacenotifications@gmail.com',
  password: 'h2$c_km^3n0t2d#i',
  host: 'imap.gmail.com',
  port: 993,
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
            // console.log('Parsed header: %s', inspect(Imap.parseHeader(buffer)));

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

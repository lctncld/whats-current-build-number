(function() {
  'use strict';

  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const mail = require('./mail');
  const Versions = require('./versions');

  const PORT = process.env.PORT || 4000;
  const STATIC_FILE_DIR = __dirname + '/../static';

  const server = http.createServer().listen(PORT);
  server.on('request', function(request, response) {
    let requestPath = request.url;
    if (requestPath === '/version' && request.method === 'GET') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(versions.store));
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

  let versions = new Versions();

  mail.on('message', msg => {
    console.log('Message', msg.subject);
    const subject = msg.subject;
    const regex = /([\w\d.]+)(\sver.\s)([\w\d.]+)/; //TODO
    const app = subject.replace(regex, '$1').replace('FW: ', '');
    const ver = subject.replace(regex, '$3').replace('FW: ', '');

    if (!app || !ver) {
      console.info(`${app}:${ver} is not a valid application info`);
      return;
    }

    versions.add({
      app: app,
      version: ver,
      date: new Date(msg.date)
    });

  });

})();
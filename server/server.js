(function() {
  'use strict';

  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const mail = require('./mail');

  const PORT = 4000;
  const STATIC_FILE_DIR = __dirname + '/../static';

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

  let versions = [];

  mail.on('message', msg => {
    console.log('message', msg);
    const subject = msg.subject;
    const app = subject
      .split(/(.*)(ver.)(.*)/)
      .filter(e => e && !(/ver./).test(e))
      .map(e => e.trim());
    if (app.length !== 2) return;
    versions.push({
      app: app[0],
      version: app[1],
      date: new Date(msg.date)
    });

  });

})();
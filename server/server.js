(function() {
  'use strict';

  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const WebSocketServer = require('ws').Server;
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

  let wss = new WebSocketServer({server: server});
  wss.on('connection', ws => {
    setInterval(_ => ws.send('ping', handleWsSendError), 60 * 1000);
    mail.on('message', msg => ws.send('update', handleWsSendError));
  });

  function handleWsSendError(err) {
    console.warn('ws send error', err);
  }

  let versions = new Versions();

  mail.on('message', msg => {
    console.log('Message', msg);
    versions.add(msg);
  });

})();
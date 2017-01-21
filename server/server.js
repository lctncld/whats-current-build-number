(function() {
  'use strict';

  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const WebSocketServer = require('ws').Server;
  const versionSource = require('./emailVersionSource');
  const Versions = require('./versions');

  const PORT = process.env.PORT || 4000;
  const STATIC_FILE_DIR = __dirname + '/../static';

  const log = require('bunyan').createLogger({ name: 'Server' });
  const server = http.createServer().listen(PORT);

  let versions = new Versions();

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
        log.warn(e);
        response.writeHead(404);
        response.end();
      });
      fsStream.pipe(response);
    }
  });

  let wss = new WebSocketServer({ server: server });
  wss.on('connection', ws => {
    setInterval(_ => ws.send('ping', handleWsSendError), 60 * 1000);
    versionSource.on('update', (err, data) => ws.send('update', handleWsSendError));
  });

  function handleWsSendError(err) {
    log.warn('ws send error', err);
  }

  versionSource.on('update', (err, data) => {
    if (err) return;
    log.info('Message', data);
    versions.add(data);
  });

})();
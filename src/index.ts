import chalk from 'chalk';
import morgan from 'morgan';
import fs from 'fs';
import express from 'express';
import https from 'https';

import { PORT, VERBOSE } from './config';
import { printServedEndpoints } from './utils';

import { MirrorRequestHandler } from './handlers/mirror-handler';
import { ValidateRequestHandler } from './handlers/validate-request-handler';
import { LegacyGradlePluginsHandler } from './handlers/gradle-plugins-handler';

const SSL_OPTIONS = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('cert.pem'),
};

// Initialize the Express app
const app = express();
if (VERBOSE) {
  app.use(morgan('combined'));
}

// Define routes with the existing handlers
app.get('*', ValidateRequestHandler);
app.get('*', LegacyGradlePluginsHandler);
app.get('*', MirrorRequestHandler);

https.createServer(SSL_OPTIONS, app).listen(PORT, () => {
  console.log('add this ⬇️  in build.gradle');
  console.log(
    chalk.green(
      'Help: replace google() with maven { url "https://yoursite.com:9443" }'
    )
  );

  printServedEndpoints(PORT);
});

import fs from 'fs';
import chalk from 'chalk';
import Fastify from 'fastify';
import middie from '@fastify/middie';
import morgan from 'morgan';
import { PORT, TMP_DIR, VERBOSE, CACHE_DIR, DEFAULT_PATH } from './config';
import { printServedEndpoints } from './utils';

import { MirrorRequestHandler } from './handlers/mirror-handler';
import { ValidateRequestHandler } from './handlers/validate-request-handler';
import { NotFoundHandler } from './handlers/not-found-handler';
import path from 'path';

// SSL options using self-signed certificate for localhost
const SSL_OPTIONS = {
  key: fs.readFileSync('./privkey.pem'), // Path to the private key file
  cert: fs.readFileSync('./cert.pem'), // Path to the self-signed certificate file
};

async function main() {
  // init cache dir
  if (!fs.existsSync(path.resolve(CACHE_DIR))) {
    fs.mkdirSync(path.resolve(CACHE_DIR), { recursive: true });
  }

  // init temp dir
  if (!fs.existsSync(path.resolve(TMP_DIR))) {
    fs.mkdirSync(path.resolve(TMP_DIR), { recursive: true });
  }

  // Initialize the Fastify app with HTTPS options
  const fastify = Fastify({
    logger: VERBOSE,
    https: SSL_OPTIONS,
  });

  try {
    // Register the middie plugin for middleware support
    await fastify.register(middie);

    // Use morgan as a middleware if VERBOSE is enabled
    if (VERBOSE) {
      fastify.use(morgan('combined'));
    }

    fastify.use(ValidateRequestHandler);
    fastify.use(MirrorRequestHandler);
    fastify.use(NotFoundHandler);

    // Start the Fastify server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(
      `Server is running with HTTPS on https://127.0.0.1:${PORT}/${DEFAULT_PATH}`
    );

    // Logs for build.gradle instructions
    console.log('add this ⬇️  in build.gradle');
    console.log(
      chalk.green(
        `maven { url "https://127.0.0.1:${PORT}/${DEFAULT_PATH}"; allowInsecureProtocol true }`
      )
    );
    console.log('\nadd this ⬇️  in build.gradle.kts');
    console.log(
      chalk.green(
        `maven { url = uri("https://127.0.0.1:${PORT}/${DEFAULT_PATH}"); isAllowInsecureProtocol = true }`
      )
    );

    printServedEndpoints(PORT, DEFAULT_PATH);

    // Help message for replacing google() with your local Maven endpoint
    console.log(
      chalk.yellow(
        'Help: replace google() with maven { url "https://127.0.0.1:9443/v1" }'
      )
    );
  } catch (err) {
    // Log any errors during server setup
    fastify.log.error(err);
    process.exit(1);
  }
}

main();

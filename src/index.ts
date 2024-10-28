import fs from 'fs';
import chalk from 'chalk';
import Fastify, { FastifyInstance } from 'fastify';
import middie from '@fastify/middie';
import morgan from 'morgan';
import path from 'path';
import { PORT, TMP_DIR, VERBOSE, CACHE_DIR, DEFAULT_PATH } from './config';
import { printServedEndpoints } from './utils';
import { MirrorRequestHandler } from './handlers/mirror-handler';
import { ValidateRequestHandler } from './handlers/validate-request-handler';
import { NotFoundHandler } from './handlers/not-found-handler';
import { HomeHandler } from './handlers/home_handler';
import { StaticHandler } from './handlers/static_handler';

// SSL options using self-signed certificate for localhost
const getSSLOptions = () => ({
  key: fs.readFileSync('./privkey.pem'), // Path to the private key file
  cert: fs.readFileSync('./cert.pem'), // Path to the self-signed certificate file
});

async function main() {
  initializeDirectories([CACHE_DIR, TMP_DIR]);

  const fastify = Fastify({
    logger: VERBOSE,
    https: getSSLOptions(),
  });

  try {
    await registerMiddleware(fastify);

    await startServer(fastify);

    displayStartupInfo();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

function initializeDirectories(directories: string[]) {
  directories.forEach((dir) => {
    const resolvedPath = path.resolve(dir);
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }
  });
}

async function registerMiddleware(fastify: FastifyInstance) {
  await fastify.register(middie);

  if (VERBOSE) {
    fastify.use(morgan('combined'));
  }

  fastify.use(HomeHandler);
  fastify.use(StaticHandler);
  fastify.use(ValidateRequestHandler);
  fastify.use(MirrorRequestHandler);
  fastify.use(NotFoundHandler);
}

async function startServer(fastify: FastifyInstance) {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(
    `Server is running with HTTPS on https://127.0.0.1:${PORT}/${DEFAULT_PATH}`
  );
}

function displayStartupInfo() {
  console.log('add this ⬇️  in build.gradle');
  console.log(
    chalk.green(`maven { url "https://127.0.0.1:${PORT}/${DEFAULT_PATH}" }`)
  );
  console.log('\nadd this ⬇️  in build.gradle.kts');
  console.log(
    chalk.green(
      `maven { url = uri("https://127.0.0.1:${PORT}/${DEFAULT_PATH}")`
    )
  );

  printServedEndpoints(PORT, DEFAULT_PATH);

  console.log(
    chalk.yellow(
      'Help: replace google() with maven { url "https://127.0.0.1:9443/v1" }'
    )
  );
}

main();

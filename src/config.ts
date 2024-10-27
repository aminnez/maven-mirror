import fs from 'fs';
import yaml from 'js-yaml';
import { Config } from '../types';

const config = yaml.load(fs.readFileSync('config.yml', 'utf8')) as Config;

const {
  REPOSITORIES,
  PROXIES,
  IGNORE_FILES = [],
  VALID_FILE_TYPES = [],
} = config;

const PORT = config.PORT ?? 9443;
const VERBOSE = config.LOG_REQUESTS ?? false;

export { PORT, PROXIES, VERBOSE, IGNORE_FILES, REPOSITORIES, VALID_FILE_TYPES };

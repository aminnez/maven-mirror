import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Config } from '../types';

const config = yaml.load(
  fs.existsSync('config.local.yml')
    ? fs.readFileSync('config.local.yml', 'utf8')
    : fs.readFileSync('config.yml', 'utf8')
) as Config;

const {
  REPOSITORIES,
  PROXIES,
  IGNORE_FILES = [],
  VALID_FILE_TYPES = [],
} = config;

const PORT = config.PORT ?? 9443;
const CACHE_DIR = path.resolve('./local-cache', '__MMT_CACHE__');
const TMP_DIR = path.resolve('./local-cache', '__MMT_TMP__');
const CACHE_TIME = config.CACHE_TIME ?? 2678400;
const DEFAULT_PATH = config.DEFAULT_PATH ?? 'v1';
const VERBOSE = config.LOG_REQUESTS ?? true;

export {
  PORT,
  PROXIES,
  VERBOSE,
  TMP_DIR,
  CACHE_DIR,
  CACHE_TIME,
  DEFAULT_PATH,
  IGNORE_FILES,
  REPOSITORIES,
  VALID_FILE_TYPES,
};

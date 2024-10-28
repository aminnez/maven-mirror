import { Handler, IncomingMessageExtended } from '@fastify/middie';
import { Downloader } from '../downloader/downloader';
import {
  getCachedServer,
  getContentType,
  handleError,
  normalizeUrl,
  send403,
} from '../utils';
import { ServerResponse, IncomingMessage } from 'http';
import path from 'path';
import { CACHE_DIR, CACHE_TIME } from '../config';
import { stat } from 'fs/promises';
import crypto from 'crypto';
import { createReadStream, Stats } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { Server } from 'app/types';

const downloader = new Downloader();
const pipelineAsync = promisify(pipeline);

export const MirrorRequestHandler: Handler = async (
  req: IncomingMessage & IncomingMessageExtended,
  res: ServerResponse
) => {
  const url = normalizeUrl(req.url);

  try {
    const server = await getCachedServer(url);
    if (server) {
      const cachedPath = path.join(CACHE_DIR, server.name, url);
      return await handleCachedRequest(req, res, cachedPath);
    }

    const srv = await downloader.getRepository(url);
    if (!srv) {
      console.error('❌', url, 'Repository not found');
      return send403(res);
    }

    handleDownloadOrHead(req, res, url, srv);
  } catch (error) {
    console.error(error);
    send403(res);
  }
};

const handleCachedRequest = async (
  req: IncomingMessage & IncomingMessageExtended,
  res: ServerResponse,
  filePath: string
) => {
  try {
    const fileStats = await stat(filePath);
    if (isCacheValid(req, fileStats)) {
      res.statusCode = 304;
      return res.end();
    }

    prepareCachedFileHeaders(res, filePath, fileStats);
    if (req.method === 'HEAD') {
      return res.end();
    }

    const fileStream = createReadStream(filePath);
    await pipelineAsync(fileStream, res);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    handleError(res, 500, 'Internal Server Error');
  }
};

const isCacheValid = (
  req: IncomingMessage & IncomingMessageExtended,
  fileStats: Stats
): boolean => {
  const etag = generateETag(fileStats);
  if (req.headers['if-none-match'] === etag && req.method === 'HEAD') {
    return true;
  }

  const ifModifiedSince = req.headers['if-modified-since'];

  return (
    ifModifiedSince !== undefined &&
    new Date(ifModifiedSince) >= new Date(fileStats.mtime) &&
    req.method === 'HEAD'
  );
};

const prepareCachedFileHeaders = (
  res: ServerResponse,
  filePath: string,
  fileStats: Stats
) => {
  const etag = generateETag(fileStats);
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', `public, max-age=${CACHE_TIME}`);
  res.setHeader('Last-Modified', fileStats.mtime.toUTCString());
  res.setHeader('Content-Type', getContentType(filePath));
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${path.basename(filePath)}"`
  );
  res.setHeader('Content-Length', fileStats.size);
};

const generateETag = (fileStats: Stats): string => {
  return crypto
    .createHash('md5')
    .update(`${fileStats.size}-${fileStats.mtimeMs}`)
    .digest('hex');
};

const handleDownloadOrHead = (
  req: IncomingMessage & IncomingMessageExtended,
  res: ServerResponse,
  url: string,
  srv: Server
) => {
  if (req.method === 'HEAD') {
    downloader.head({ url, srv, res });
  } else {
    downloader.download({ url, srv, req, res });
  }
};

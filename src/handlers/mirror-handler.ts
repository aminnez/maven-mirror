import { Handler, IncomingMessageExtended } from '@fastify/middie';
import { Downloader } from '../downloader/downloader';
import { getCachedServer, send403 } from '../utils';
import { ServerResponse, IncomingMessage } from 'http';
import path from 'path';
import { CACHE_DIR, CACHE_TIME } from '../config';
import { stat } from 'fs/promises';
import crypto from 'crypto';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

const downloader = new Downloader();
const pipelineAsync = promisify(pipeline);

export const MirrorRequestHandler: Handler = (
  req: IncomingMessage & IncomingMessageExtended,
  res: ServerResponse
) => {
  const url = req.url!.replace(/^\/\w+\//, '/');

  const server = getCachedServer(url);
  if (server) {
    const cachedPath = path.join(CACHE_DIR, server.name, url);
    console.log(`📦 [${server.name}]`, url);
    return sendCachedFile(req, res, cachedPath);
  }
  downloader
    .getRepository(url)
    .then((srv) => {
      if (srv) {
        if (req.method === 'HEAD') {
          downloader.head({ url, srv, res });
        } else {
          downloader.download({ url, srv, req, res });
        }
      } else {
        if (!res.headersSent) {
          send403(res);
        }
      }
    })
    .catch(() => {
      if (!res.headersSent) {
        send403(res);
      }
    });
};

const sendCachedFile = async (
  req: IncomingMessage & IncomingMessageExtended,
  res: ServerResponse,
  filePath: string
) => {
  try {
    const fileStats = await stat(filePath);

    const etag = crypto
      .createHash('md5')
      .update(`${fileStats.size}-${fileStats.mtimeMs}`)
      .digest('hex');

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', `public, max-age=${CACHE_TIME}`);

    const lastModified = fileStats.mtime.toUTCString();
    res.setHeader('Last-Modified', lastModified);

    if (req.headers['if-none-match'] === etag && req.method === 'HEAD') {
      res.statusCode = 304;
      res.end();
      return;
    }

    const ifModifiedSince = req.headers['if-modified-since'];
    if (
      ifModifiedSince &&
      new Date(ifModifiedSince) >= new Date(fileStats.mtime) &&
      req.method === 'HEAD'
    ) {
      res.statusCode = 304;
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filePath.split('/').pop()}"`
    );
    res.setHeader('Content-Length', fileStats.size);

    const fileStream = createReadStream(filePath);

    await pipelineAsync(fileStream, res);
  } catch (error) {
    console.error('File streaming failed:', error);
    res.statusCode = 500;
    res.end('Failed to read the file');
  }
};

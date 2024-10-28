import got, { GotOptions } from 'got';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { CACHE_DIR, PROXIES, REPOSITORIES, TMP_DIR } from '../config';
import { ProxyAgent } from 'proxy-agent';
import { Server } from 'app/types';
import { extractFileInfo, handleError, headersToMap } from '../utils';
import { Duplex, pipeline } from 'stream';
import { promisify } from 'util';
import { IncomingMessageExtended } from '@fastify/middie';
import path from 'path';
import fs, { createWriteStream } from 'fs';
import { console } from 'inspector';

export class Downloader {
  db: Record<string, { serverIndex: number }> = {};
  private pipelineAsync = promisify(pipeline);

  private getAgent(srv: Server) {
    const proxy = srv.proxy && srv.proxy in PROXIES ? PROXIES[srv.proxy] : null;
    if (!proxy) return null;

    return new ProxyAgent({
      getProxyForUrl: () =>
        proxy.auth
          ? `${proxy.protocol}://${proxy.auth.username}:${proxy.auth.password}@${proxy.host}:${proxy.port}`
          : `${proxy.protocol}://${proxy.host}:${proxy.port}`,
    });
  }

  private getOptions(
    srv: Server,
    method: 'get' | 'head' = 'get'
  ): GotOptions<typeof method> {
    const options: GotOptions<typeof method> = { method };
    const agent = this.getAgent(srv);

    if (agent) {
      options.agent = { http: agent, https: agent };
    }

    if (srv.auth) {
      options.headers = {
        authorization: `Basic ${Buffer.from(
          `${srv.auth.username}:${srv.auth.password}`
        ).toString('base64')}`,
      };
    }

    if (method === 'head') {
      options.timeout = { request: 10000 };
    }

    return options;
  }

  private async checkRepository(url: string, srv: Server) {
    const options = this.getOptions(srv, 'head');
    const head = await got.head(srv.url + url, options);
    return head;
  }

  async getRepository(url: string) {
    if (this.db[url]?.serverIndex !== undefined) {
      return REPOSITORIES[this.db[url].serverIndex];
    }

    try {
      const availableServerIndex = await this.findAvailableServerIndex(url);
      if (availableServerIndex !== null) {
        this.db[url] = { serverIndex: availableServerIndex };
        return REPOSITORIES[availableServerIndex];
      }
    } catch {
      return null;
    }
  }

  private async findAvailableServerIndex(url: string): Promise<number | null> {
    const gotPromises = REPOSITORIES.map(async (srv, index) => {
      try {
        const check = await this.checkRepository(url, srv);
        console.log(check);
        return index;
      } catch (error) {
        console.error(error);
        return null;
      }
    });

    try {
      const availableIndex = await Promise.any(gotPromises);
      return availableIndex ?? null;
    } catch {
      return null;
    }
  }

  async head({
    url,
    srv,
    res,
  }: {
    url: string;
    srv: Server;
    res: ServerResponse;
  }) {
    try {
      const response = await got.head(
        srv.url + url,
        this.getOptions(srv, 'head')
      );
      this.setResponseHeaders(res, response.headers, response.statusCode);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      handleError(res, 404, 'Page Not Found');
    }
  }

  download({
    url,
    srv,
    req,
    res,
  }: {
    url: string;
    srv: Server;
    req: IncomingMessage & IncomingMessageExtended;
    res: ServerResponse;
  }) {
    const { fileName, relativePath } = extractFileInfo(url);
    const tmpPath = path.join(TMP_DIR, fileName);
    const stream = got.stream(srv.url + url, this.getOptions(srv));
    const fileWriterStream = createWriteStream(tmpPath);

    this.handleDownloadStream(
      stream,
      res,
      tmpPath,
      srv,
      url,
      fileName,
      relativePath,
      req
    );

    stream.pipe(fileWriterStream);
  }

  private handleDownloadStream(
    stream: got.GotEmitter & Duplex,
    res: ServerResponse,
    tmpPath: string,
    srv: Server,
    url: string,
    fileName: string,
    relativePath: string,
    req: IncomingMessage & IncomingMessageExtended
  ) {
    this.pipelineAsync(stream, res).catch((err) => {
      console.error('❌', srv.url + url, err.message);
      handleError(res, 500, err);
    });

    stream.on('downloadProgress', ({ total }) => {
      if (total) {
        console.log(`📥 ⏳ ${total} [${srv.name}]`, url);
      }
    });

    stream.on('error', (err) => {
      console.error('❌', srv.url + url, err.message);
      handleError(res, 500, err.message);
    });

    stream.on('response', (response) => {
      response.on('end', () =>
        this.finalizeDownload(
          req,
          res,
          srv,
          url,
          tmpPath,
          fileName,
          relativePath
        )
      );
    });
  }

  private finalizeDownload(
    req: IncomingMessage & IncomingMessageExtended,
    res: ServerResponse,
    srv: Server,
    url: string,
    tmpPath: string,
    fileName: string,
    relativePath: string
  ) {
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✅ [${srv.name}]`, url);
      const destPath = path.join(CACHE_DIR, srv.name, relativePath, fileName);
      this.copyFileToCache(tmpPath, destPath);

      if (req.headers['alias-url']) {
        const aliasInfo = extractFileInfo(req.headers['alias-url'] as string);
        const aliasPath = path.join(
          CACHE_DIR,
          srv.name,
          aliasInfo.relativePath,
          aliasInfo.fileName
        );
        this.copyFileToCache(destPath, aliasPath, false);
      }
    }
  }

  private setResponseHeaders(
    res: ServerResponse,
    headers: IncomingHttpHeaders,
    statusCode: number
  ) {
    res.setHeaders(headersToMap(headers));
    if (!res.headersSent) {
      res.statusCode = statusCode;
      res.end();
    }
  }

  private copyFileToCache(source: string, dest: string, moveFile = true) {
    const { relativePath: destDir } = extractFileInfo(dest);
    if (fs.existsSync(source) && fs.statSync(source).size > 0) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      if (moveFile) {
        fs.renameSync(source, dest);
      } else {
        fs.copyFileSync(source, dest);
      }
    }
  }
}

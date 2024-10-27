import got, { GotOptions } from 'got';
import type { Response, Request } from 'express';

import { PROXIES, REPOSITORIES } from '../config';
import { ProxyAgent } from 'proxy-agent';
import { Server } from 'app/types';

export class GotDownloader {
  db: Record<
    string,
    {
      serverIndex: number;
    }
  > = {};

  getAgent = (srv: Server) => {
    const proxy = srv.proxy && srv.proxy in PROXIES ? PROXIES[srv.proxy] : null;
    if (proxy) {
      return new ProxyAgent({
        getProxyForUrl: () =>
          proxy.auth
            ? `${proxy.protocol}://${proxy.auth.username}:${proxy.auth.password}@${proxy.host}:${proxy.port}`
            : `${proxy.protocol}://${proxy.host}:${proxy.port}`,
      });
    }
    return null;
  };

  getOptions = (srv: Server, method: 'get' | 'head' = 'get') => {
    const options: GotOptions<typeof method> = { method };
    const agent = this.getAgent(srv);
    if (agent) {
      options.agent = {
        http: agent,
        https: agent,
      };
    }

    if (srv.auth) {
      options.headers = {};
      options.headers.authorization = `Basic ${Buffer.from(
        `${srv.auth.username}:${srv.auth.password}`
      ).toString('base64')}`;
    }

    if (method === 'head') {
      options.timeout = { request: 5000 };
    }

    return options;
  };

  checkServer = (url: string, srv: Server) => {
    const options = this.getOptions(srv, 'head');
    return got.head(srv.url + url, options);
  };

  getSupportedServer = async (url: string) => {
    if (this.db[url]?.serverIndex) {
      return REPOSITORIES[this.db[url].serverIndex];
    }
    const gotPromises = REPOSITORIES.map((srv) => this.checkServer(url, srv));
    return Promise.any(gotPromises.map((req, index) => req.then(() => index)))
      .then((index) => {
        // cancel all got requests
        gotPromises.forEach((req) => req.cancel());
        this.db[url] = {
          serverIndex: index,
        };
        return REPOSITORIES[index];
      })
      .catch(() => null);
  };

  head = ({ url, srv, res }: { url: string; srv: Server; res: Response }) => {
    got
      .head(srv.url + url, this.getOptions(srv, 'head'))
      .then((r) => {
        res.set(r.headers);
        if (!res.headersSent) {
          res.sendStatus(r.statusCode);
        }
      })
      .catch((r: { statusCode?: number }) => {
        if (!res.headersSent) {
          res.sendStatus(r?.statusCode ?? 404);
        }
      });
  };

  download = ({
    url,
    srv,
    res,
  }: {
    url: string;
    srv: Server;
    req: Request;
    res: Response;
  }) => {
    const stream = got.stream(srv.url + url, this.getOptions(srv));
    stream.pipe(res);

    stream.once('downloadProgress', ({ total }) => {
      if (total) {
        console.log(`📥 ⏳ [${srv.name}]`, url);
      }
    });

    stream.on('error', (err) => {
      console.log('❌', srv.url + url);
      console.log('⛔️', err.message);
      res.destroy(err);
    });

    stream.on('finish', () => {
      delete this.db[url];
    });

    stream.on('response', (res) => {
      res.on('end', () => {
        delete this.db[url];
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ [${srv.name}]`, url);
        }
      });
    });
  };
}

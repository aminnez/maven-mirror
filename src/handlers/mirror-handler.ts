import { RequestHandler } from 'express';

import { GotDownloader } from '../downloader/got';

const downloader = new GotDownloader();

export const MirrorRequestHandler: RequestHandler = (req, res) => {
  const url = req.url;

  downloader
    .getSupportedServer(url)
    .then((srv) => {
      if (srv) {
        if (req.method === 'HEAD') {
          downloader.head({ url, srv, res });
        } else {
          downloader.download({ url, srv, res, req });
        }
      } else {
        if (!res.headersSent) {
          res.sendStatus(403);
        }
      }
    })
    .catch(() => {
      if (!res.headersSent) {
        res.sendStatus(403);
      }
    });
};

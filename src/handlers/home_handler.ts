import {
  Handler,
  IncomingMessageExtended,
  NextFunction,
} from '@fastify/middie';
import path from 'path';
import { handleFile, normalizeUrl, redirectTo } from '../utils';
import { IncomingMessage, ServerResponse } from 'http';

export const HomeHandler: Handler = async (
  req: IncomingMessage & IncomingMessageExtended,
  res: ServerResponse,
  next: NextFunction
) => {
  try {
    if (shouldRedirectToV1(req.url)) {
      return redirectTo(res, '/v1');
    }

    if (shouldRemoveTrailingSlash(req.url)) {
      const url = normalizeUrl(req.url);
      return redirectTo(res, url);
    }

    if (req.url === '/v1') {
      return await handleHomePage(res);
    }

    next();
  } catch {
    next();
  }
};

const shouldRedirectToV1 = (url: string | undefined): boolean => {
  return url === '/' || url === '/index.html' || url === '/v1/index.html';
};

const shouldRemoveTrailingSlash = (url: string | undefined): boolean => {
  return !!url && url.endsWith('/');
};

const handleHomePage = async (res: ServerResponse) => {
  await handleFile(res, path.join('public', 'index.html'));
};

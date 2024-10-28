import {
  Handler,
  IncomingMessageExtended,
  NextFunction,
} from '@fastify/middie';
import path from 'path';
import { handleFile, normalizeUrl } from '../utils';
import { IncomingMessage, ServerResponse } from 'http';

export const StaticHandler: Handler = async (
  req: IncomingMessage & IncomingMessageExtended,
  res: ServerResponse,
  next: NextFunction
) => {
  const normalizedUrl = normalizeUrl(req.url);
  const filePath = getFilePath(normalizedUrl);

  try {
    await handleFile(res, filePath);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    next();
  }
};

const getFilePath = (url: string): string => {
  return path.join('public', url);
};

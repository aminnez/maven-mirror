import { Handler } from '@fastify/middie';
import { IGNORE_FILES, VALID_FILE_TYPES } from '../config';
import {
  extractFileInfo,
  logRequest,
  normalizeUrl,
  send403,
  send404,
} from '../utils';

export const ValidateRequestHandler: Handler = (req, res, next) => {
  const url = normalizeUrl(req.url);

  if (!isMethodAllowed(req.method)) {
    console.error('❌ method not allowed', req.method, url);
    return send403(res);
  }

  if (!isValidFileType(url)) {
    logRequest('♻️', url);
    return send404(res);
  }

  if (isIgnoredFile(url)) {
    logRequest('❌ [404]', url);
    return send404(res);
  }

  logRequest(req.method, url);

  next();
};

const isMethodAllowed = (method: string | undefined): boolean => {
  return method === 'HEAD' || method === 'GET';
};

const isValidFileType = (url: string): boolean => {
  const { fileExtension } = extractFileInfo(url);
  return VALID_FILE_TYPES.includes('.' + fileExtension);
};

const isIgnoredFile = (url: string): boolean => {
  return IGNORE_FILES.some((str) => url.includes(str));
};

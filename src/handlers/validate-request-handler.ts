import { Handler } from '@fastify/middie';
import { IGNORE_FILES, VALID_FILE_TYPES } from '../config';
import { extractFileInfo, send403, send404 } from '../utils';

export const ValidateRequestHandler: Handler = (req, res, next) => {
  const url = req.url.replace(/^\/\w+\//, '/');
  if (req.method !== 'HEAD' && req.method !== 'GET') {
    send403(res);
    return;
  }

  const { fileExtension } = extractFileInfo(url);

  if (!VALID_FILE_TYPES.includes('.' + fileExtension)) {
    console.log('♻️', url);
    send404(res);
    return;
  }

  if (IGNORE_FILES.find((str) => url.includes(str))) {
    console.log('❌ [404]', url);
    send404(res);
    return;
  }

  console.log(req.method, url);

  next();
};

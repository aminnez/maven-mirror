import { RequestHandler } from 'express';

import { IGNORE_FILES, VALID_FILE_TYPES } from '../config';
import { extractFileInfo } from '../utils';

export const ValidateRequestHandler: RequestHandler = (req, res, next) => {
  const url = req.url;
  if (req.method !== 'HEAD' && req.method !== 'GET') {
    res.sendStatus(403);
    return;
  }

  const { fileExtension } = extractFileInfo(url);

  if (!VALID_FILE_TYPES.includes('.' + fileExtension)) {
    console.log('♻️', url);
    res.status(404);
    return;
  }

  if (IGNORE_FILES.find((str) => url.includes(str))) {
    console.log('❌ [404]', url);
    res.status(404);
    return;
  }

  console.log(req.method, url);

  next();
};

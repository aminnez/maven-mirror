import { IncomingHttpHeaders, ServerResponse } from 'http';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { CACHE_DIR, CACHE_TIME, REPOSITORIES } from './config';

const getFileStats = async (filePath: string) => {
  try {
    const stats = await fs.stat(filePath);
    return stats;
  } catch {
    return null;
  }
};

export const getCachedServer = async (filePath: string) => {
  for (const srv of REPOSITORIES) {
    const fPath = path.join(CACHE_DIR, srv.name, filePath);
    const fileStats = await getFileStats(fPath);

    if (fileStats && fileStats.size > 0) {
      const now = new Date();
      const fileAge =
        (now.getTime() - fileStats.mtime.getTime()) / (1000 * CACHE_TIME);

      if (fileAge < 1) {
        return srv;
      } else {
        await fs.unlink(fPath);
      }
    }
  }
  return null;
};

export const printServedEndpoints = (
  port: number | string,
  urlPath: string
) => {
  try {
    const interfaces = os.networkInterfaces();
    const list = Object.values(interfaces)
      .flat()
      .filter((item) => item && item.family === 'IPv4');
    const localInterface = list.find((item) => item!.internal);
    const networkInterface = list.find((item) => !item!.internal);

    console.log('\n🚀 Serving!');
    console.log('--------------------------------------------');
    console.log(`Local: http://0.0.0.0:${port}/${urlPath}`);
    if (localInterface) {
      console.log(`Local: http://${localInterface.address}:${port}/${urlPath}`);
    }
    if (networkInterface) {
      console.log(
        `Network: http://${networkInterface.address}:${port}/${urlPath}`
      );
    }
    console.log('--------------------------------------------');
  } catch {
    console.log('\n🚀 Serving!');
    console.log('--------------------------------------------');
    console.log(`Local: http://0.0.0.0:${port}/${urlPath}`);
    console.log(`Local: http://127.0.0.1:${port}/${urlPath}`);
    console.log('--------------------------------------------');
  }
};

export const extractFileInfo = (url: string) => {
  const segments = url.split('/');
  const fileName = segments.pop()?.replace(/\?.*$/, '') ?? '';
  const fileExtension = path.extname(fileName).substring(1);
  const relativePath = segments.join('/');

  return { fileName, relativePath, fileExtension };
};

export const normalizeUrl = (url: string | undefined): string => {
  return url?.replace(/^\/\w+\//, '/') ?? '/';
};

export function headersToMap(
  headers: IncomingHttpHeaders
): Map<string, number | string | readonly string[]> {
  const headersMap = new Map<string, number | string | readonly string[]>();

  for (const [key, value] of Object.entries(headers)) {
    // TypeScript ensures value is number | string | readonly string[]
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      Array.isArray(value)
    ) {
      headersMap.set(key.toLowerCase(), value);
    }
  }

  return headersMap;
}

export async function handleError(
  res: ServerResponse,
  errorCode: number,
  errorMessage: string
) {
  const filePath = path.join('public', 'error-page.html');

  try {
    const htmlTemplate = await fs.readFile(filePath, 'utf-8');
    const htmlContent = renderErrorPage(
      htmlTemplate,
      errorCode.toString(),
      errorMessage
    );

    res.setHeader('Content-Type', 'text/html');
    res.statusCode = errorCode;
    res.end(htmlContent);
  } catch (error) {
    console.error(error);
    res.setHeader('Content-Type', 'text/plain');
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}

export function send404(res: ServerResponse) {
  handleError(
    res,
    404,
    'Page Not Found - The page you are looking for does not exist.'
  );
}

export function send403(res: ServerResponse) {
  handleError(
    res,
    403,
    'Forbidden - You do not have permission to access this page.'
  );
}

export const redirectTo = (res: ServerResponse, location: string) => {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
};

function renderErrorPage(
  html: string,
  errorCode: string,
  errorMessage: string
): string {
  return html
    .replaceAll('[ERROR_CODE]', errorCode)
    .replaceAll('[ERROR_MESSAGE]', errorMessage);
}

export async function handleFile(res: ServerResponse, filePath: string) {
  const stats = await getFileStats(filePath);
  if (stats && !stats.isDirectory()) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const contentType = getContentType(filePath);
    res.setHeader('Content-Type', contentType);
    res.statusCode = 200;
    res.end(fileContent);
  } else {
    throw new Error('File not found');
  }
}

export function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.jar': 'application/java-archive',
    '.zip': 'application/zip',
    '.xml': 'application/xml',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

export const logRequest = (prefix: string, url: string): void => {
  console.log(`${prefix} ${url}`);
};

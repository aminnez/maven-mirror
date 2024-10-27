/* eslint-disable @typescript-eslint/no-unused-vars */
import { Handler } from '@fastify/middie';
import { send404 } from '../utils';

export const NotFoundHandler: Handler = (req, res, next) => {
  send404(res);
};

import type { Server } from 'node:http';
import app from '../../src/app';

// One listening server per test file. supertest's default (listen + close per request)
// churns ephemeral ports and intermittently fails with "Parse Error: Expected HTTP/".
let server: Server | null = null;

export const getTestServer = (): Server => {
  if (!server) server = app.listen(0);
  return server;
};

export const closeTestServer = (): Promise<void> =>
  new Promise((resolve) => {
    if (!server) return resolve();
    server.closeAllConnections();
    server.close(() => resolve());
    server = null;
  });

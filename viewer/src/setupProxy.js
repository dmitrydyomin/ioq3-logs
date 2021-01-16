// eslint-disable-next-line import/no-extraneous-dependencies
const proxy = require('http-proxy-middleware');

module.exports = function useProxy(app) {
  app.use(
    proxy('/api', {
      target: 'http://localhost:3001/',
      pathRewrite: {
        '^/api': '',
      },
    }),
    proxy('/socket.io', {
      target: 'http://localhost:3001/',
      ws: true,
      proxyTimeout: 7 * 86400 * 1000,
      timeout: 7 * 86400 * 1000,
    }),
  );
};

// eslint-disable-next-line import/no-extraneous-dependencies
const proxy = require('http-proxy-middleware');

module.exports = function useProxy(app) {
  app.use(
    proxy('/api', {
      target: 'http://localhost:3001/',
      pathRewrite: {
        '^/api': '',
      },
      ws: true,
      proxyTimeout: 7 * 86400 * 1000,
      timeout: 7 * 86400 * 1000,
    }),
  );
};

/**
 * This file is part of the PerfMa.
 * @link     : http://perfma.com
 * @author   : William Chan (root@williamchan.me)
 * @copyright: Copyright (c) 2019 Hangzhou perfma Network Technology Co., Ltd.
 * @notice   : 此文件正式环境，请考虑性能问题，nodejs CPU密集型性能很弱。
 */

const fs = require('fs');
const path = require('path');
const LRU = require('lru-cache');
const express = require('express');
// const favicon = require('serve-favicon');
const { createBundleRenderer } = require('vue-server-renderer');
const compression = require('compression');
const bundle = require('../dist/vue-ssr-server-bundle.json');
const clientManifest = require('../dist/vue-ssr-client-manifest.json');
const getContext = require('./context');

const fullPath = s => path.join(__dirname, '..', s);

const renderer = createBundleRenderer(bundle, {
  template: fs.readFileSync(fullPath('/template/ssr.html'), 'utf-8'),
  cache: LRU({
    max: 1000,
    maxAge: 1000 * 60 * 15,
  }),
  basedir: fullPath('/dist'),
  runInNewContext: 'once',
  clientManifest,
});

const serve = (path, cache) => express.static(fullPath(path), {
  maxAge: cache && 1000 * 60 * 60 * 24 * 30,
});

const app = express();
app.use(compression({ threshold: 0 }));
// app.use(favicon('./public/favicon.ico'));
// app.use('/dist/service-worker.js', serve('./dist/service-worker.js'));
app.use('/static', serve('/dist/static', true));
app.use('/public', serve('/public', true));
app.use('/robots.txt', serve('/public/robots.txt', true));

app.disable('x-powered-by');
app.set('trust proxy', true);

app.get('*', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  const context = getContext(req);
  renderer.renderToString(context, (err, html) => {
    if (err) {
      if (err.url) {
        res.redirect(err.url);
      } else if (err.code === 404) {
        res.status(404).send('404 | Page Not Found');
      } else {
        // Render Error Page or Redirect
        res.status(500).send('500 | Internal Server Error');
        console.error(`error during render : ${req.url}`);
        console.error(err.stack);
      }
    } else {
      if (context.httpStatus) res.status(context.httpStatus);
      res.send(html);
    }
  });
});

const port = process.env.PORT || 12800;
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => {
  console.log(`> server started at ${host}:${port}\n`);
});

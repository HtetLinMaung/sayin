module.exports = (req, res, next) => {
  console.log({
    path: req.path,
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers,
  });
  next();
};

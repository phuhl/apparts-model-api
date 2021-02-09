const applyMiddleware = require("./tests/middleware");
const express = require("express");

module.exports = (DB_CONFIG) => () => {
  const app = express();
  app.use((req, res, next) => {
    req.headers = {
      ...req.headers,
      "x-apigateway-event": encodeURIComponent(
        JSON.stringify({
          path: "/foo/bar",
          queryStringParameters: {
            foo: "💩",
          },
        })
      ),
      "x-apigateway-context": encodeURIComponent(
        JSON.stringify({ foo: "bar" })
      ),
    };

    next();
  });

  applyMiddleware(app, DB_CONFIG, true);
  return app;
};

module.exports.shutdown = () => {
  return applyMiddleware.shutdown();
};

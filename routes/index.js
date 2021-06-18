const generateGet = require("./generateGet");
const generateGetByIds = require("./generateGetByIds");
const generatePost = require("./generatePost");
const generatePut = require("./generatePut");
const generateDelete = require("./generateDelete");

const addCrud = ({ prefix, app, model, routes, webtokenkey }) => {
  const methods = generateMethods(prefix, model, routes, webtokenkey);

  Object.keys(methods).forEach((method) =>
    Object.keys(methods[method]).forEach((route) =>
      app[method](prefix + route, methods[method][route])
    )
  );
};

const generateMethods = (prefix, useModel, routes, webtokenkey) => {
  const res = { get: {}, post: {}, put: {}, delete: {} };
  if (routes.get) {
    res.get[""] = generateGet(prefix, useModel, routes.get, webtokenkey);
  }
  if (routes.getByIds) {
    res.get["/:ids"] = generateGetByIds(
      prefix,
      useModel,
      routes.getByIds,
      webtokenkey
    );
  }
  if (routes.post) {
    res.post[""] = generatePost(prefix, useModel, routes.post, webtokenkey);
  }
  if (routes.put) {
    res.put["/:id"] = generatePut(prefix, useModel, routes.put, webtokenkey);
  }
  if (routes.delete) {
    res.delete["/:ids"] = generateDelete(
      prefix,
      useModel,
      routes.delete,
      webtokenkey
    );
  }
  return res;
};

module.exports = { addCrud, generateMethods };

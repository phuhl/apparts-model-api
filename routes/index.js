const generateGet = require("./generateGet");
const generateGetByIds = require("./generateGetByIds");
const generatePost = require("./generatePost");
const generatePut = require("./generatePut");
const generateDelete = require("./generateDelete");

const addCrud = (prefix, app, useModel, accessorFs, webtokenkey) => {
  const methods = generateMethods(prefix, useModel, accessorFs, webtokenkey);

  Object.keys(methods).forEach((method) =>
    Object.keys(methods[method]).forEach((route) =>
      app[method](prefix + route, methods[method][route])
    )
  );
};

const generateMethods = (prefix, useModel, accessorFs, webtokenkey) => {
  const res = { get: {}, post: {}, put: {}, delete: {} };
  if (accessorFs.get) {
    res.get[""] = generateGet(prefix, useModel, accessorFs.get, webtokenkey);
  }
  if (accessorFs.getByIds) {
    res.get["/:ids"] = generateGetByIds(
      prefix,
      useModel,
      accessorFs.get,
      webtokenkey
    );
  }
  if (accessorFs.post) {
    res.post[""] = generatePost(prefix, useModel, accessorFs.post, webtokenkey);
  }
  if (accessorFs.put) {
    res.put["/:id"] = generatePut(
      prefix,
      useModel,
      accessorFs.put,
      webtokenkey
    );
  }
  if (accessorFs.delete) {
    res.delete["/:ids"] = generateDelete(
      prefix,
      useModel,
      accessorFs.delete,
      webtokenkey
    );
  }
  return res;
};

module.exports = { addCrud, generateMethods };

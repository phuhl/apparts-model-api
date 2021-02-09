const { generateGet } = require("./generateGet");
const keep = async (p, c) => {
  try {
    if (typeof p === "function") {
      return await p();
    } else {
      return await p;
    }
  } catch (err) {
    return await c();
  }
};

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
  return res;
};

module.exports = { addCrud, generateMethods };

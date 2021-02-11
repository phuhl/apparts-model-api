const { HttpError } = require("@apparts/error");

const checkAuth = async (authF, res, me) => {
  const allowed = await authF(res, me);
  if (!allowed) {
    throw new HttpError(403, "You don't have the rights to retrieve this.");
  }
};

const createParams = (prefix, useModel) => {
  const [Models] = useModel();
  const pathParams = prefix
    .split("/")
    .filter((part) => part.substr(0, 1) === ":")
    .map((part) => part.slice(1));
  const paramTypes = {};
  for (const pathParam of pathParams) {
    if (!Models.getTypes()[pathParam]) {
      throw "Param " + pathParam + " not known in model for path " + prefix;
    }
    paramTypes[pathParam] = {
      type: Models.getTypes()[pathParam].type,
    };
  }
  return paramTypes;
};

const nameFromPrefix = (prefix) => {
  if (prefix.substr(-1) === "/") {
    prefix = prefix.slice(0, -1);
  }
  return prefix
    .split("/")
    .reverse()[0]
    .replace(/^\w/, (c) => c.toUpperCase());
};

const createReturns = (useModel) => {
  const [Models] = useModel();
  const returns = {};
  const types = Models.getTypes();
  for (const key in types) {
    const tipe = types[key];
    let name = key;
    if (tipe.public) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      returns[name] = { type: tipe.type, optional: tipe.optional };
    }
  }
  return returns;
};

const reverseMap = (collection, types) => {
  const unmappedKeys = Object.keys(collection);
  const mappedCollection = {};

  for (const key of unmappedKeys) {
    const mappedKey = Object.keys(types).filter(
      (t) => types[t].mapped === key
    )[0];
    if (mappedKey) {
      mappedCollection[mappedKey] = collection[key];
    } else if (!types[key] || types[key].mapped) {
      throw new HttpError(400, '"' + key + '" does not exist');
    } else {
      mappedCollection[key] = collection[key];
    }
  }
  return mappedCollection;
};

const keep = async (fun, exceptionType, exceptionReplacement) => {
  try {
    return await fun();
  } catch (e) {
    if (e instanceof exceptionType) {
      throw exceptionReplacement(e);
    } else {
      throw e;
    }
  }
};

module.exports = {
  createParams,
  checkAuth,
  nameFromPrefix,
  createReturns,
  reverseMap,
  keep,
};

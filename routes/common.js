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
  return (name = prefix
    .split("/")
    .reverse()[0]
    .replace(/^\w/, (c) => c.toUpperCase()));
};

module.exports = { createParams, checkAuth, nameFromPrefix };

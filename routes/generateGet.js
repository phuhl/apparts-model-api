const {
  createParams,
  nameFromPrefix,
  createReturns,
  reverseMap,
  checkAuth,
  typeFromModeltype,
  unmapKey,
} = require("./common");
const { prepauthTokenJWT } = require("@apparts/types");

const createFilter = (prefix, useModel) => {
  const filter = { optional: true, type: "object", keys: {} };
  const [Models] = useModel();
  const types = Models.getTypes();
  const params = createParams(prefix, useModel);
  for (const key in types) {
    const tipe = types[key];
    let name = key;
    if (tipe.public) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      if (!params[key]) {
        const convertedType = typeFromModeltype(tipe);
        delete convertedType.optional;
        filter.keys[name] = {
          type: "oneOf",
          alternatives: [convertedType],
          optional: true,
        };
        if (tipe.type === "string") {
          filter.keys[name].alternatives.push({
            type: "object",
            keys: {
              like: { type: "string" },
            },
          });
        }
      }
    }
  }
  return filter;
};

const createOrder = (useModel) => {
  const order = {
    optional: true,
    type: "array",
    items: {
      type: "object",
      keys: {
        key: {
          type: "oneOf",
          alternatives: [],
        },
        dir: {
          type: "oneOf",
          alternatives: [{ value: "ASC" }, { value: "DESC" }],
        },
      },
    },
  };
  const [Models] = useModel();
  const types = Models.getTypes();
  for (const key in types) {
    const tipe = types[key];
    let name = key;
    if (tipe.public) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      const convertedType = typeFromModeltype(tipe);
      delete convertedType.optional;
      order.items.keys.key.alternatives.push({
        value: name,
      });
    }
  }
  return order;
};

const generateGet = (prefix, useModel, authF, webtokenkey) => {
  const getF = prepauthTokenJWT(webtokenkey)(
    {
      query: {
        limit: { type: "int", default: 50 },
        offset: { type: "int", default: 0 },
        order: createOrder(useModel),
        filter: createFilter(prefix, useModel),
      },
      params: createParams(prefix, useModel),
    },
    async (req, me) => {
      await checkAuth(authF, req, me);

      const {
        dbs,
        query: { limit, offset },
        params,
      } = req;
      let { filter, order } = req.query;

      const [Many] = useModel(dbs);
      if (filter) {
        const types = Many.getTypes();
        filter = reverseMap(filter, types);
        for (const key in filter) {
          if (typeof filter[key] === "object") {
            if (filter[key].like) {
              filter[key] = { op: "like", val: filter[key].like };
            }
          }
        }
      }

      if (order) {
        const types = Many.getTypes();
        order = order.map(({ dir, key }) => ({
          dir,
          key: unmapKey(key, types),
        }));
      }
      const res = new Many();
      await res.load({ ...filter, ...params }, limit, offset, order);
      return res.getPublic();
    },
    {
      title: "Get " + nameFromPrefix(prefix),
      returns: [
        {
          status: 200,
          type: "array",
          items: {
            type: "object",
            keys: createReturns(useModel),
          },
        },
        { status: 403, error: "You don't have the rights to retrieve this." },
      ],
    }
  );
  return getF;
};

module.exports = generateGet;

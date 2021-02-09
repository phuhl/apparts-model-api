const {
  createParams,
  checkAuth,
  nameFromPrefix,
  createReturns,
} = require("./common");
const { HttpError } = require("@apparts/error");
const { prepauthTokenJWT } = require("@apparts/types");

const generateGet = (prefix, useModel, authF, webtokenkey) => {
  const getF = prepauthTokenJWT(webtokenkey)(
    {
      query: {
        limit: { type: "int", default: 50 },
        offset: { type: "int", default: 0 },
        order: { type: "string", optional: true },
        filter: { type: "string", optional: true },
      },
      params: createParams(prefix, useModel),
    },
    async ({ dbs, query: { limit, offset, order, filter }, params }) => {
      const [Many] = useModel(dbs);
      if (filter) {
        try {
          filter = JSON.parse(filter);
        } catch (e) {
          if (e instanceof SyntaxError) {
            return new HttpError(400, "Filter not valid");
          } else {
            throw e;
          }
        }
        const unmappedKeys = Object.keys(filter);
        const types = Many.getTypes();
        for (const key of unmappedKeys) {
          const mappedKey = Object.keys(types).filter(
            (t) => types[t].mapped === key
          )[0];
          if (mappedKey) {
            filter[mappedKey] = filter[key];
            delete filter[key];
          } else if (!types[key] || types[key].mapped) {
            return new HttpError(400, "Filter could not be applied to field");
          } else {
          }
        }
        const mappedKeys = Object.keys(filter);
        for (const key of mappedKeys) {
          if (!types[key].public || types[key].derived) {
            return new HttpError(400, "Filter could not be applied to field");
          }
          if (params[key] !== undefined) {
            return new HttpError(400, "Filter cannot be in the path, too");
          }
          if (typeof filter[key] === "object") {
            const allowedOperators = ["like"];
            const unknownOperators = Object.keys(filter[key]).filter(
              (operator) => allowedOperators.indexOf(operator) === -1
            );
            if (unknownOperators.length > 0) {
              return new HttpError(400, "Filter-operator not known");
            }

            if (filter[key].like) {
              if (
                types[key].type !== "string" ||
                typeof filter[key].like !== "string"
              ) {
                return new HttpError(
                  400,
                  "Filter-Like operator can only be applied to strings"
                );
              }
              filter[key] = { op: "like", val: filter[key].like };
            }
          }
        }
      }
      const res = new Many();
      await res.load({ ...filter, ...params }, limit, offset, order);
      return res.getPublic();
    },
    {
      title: "Get " + nameFromPrefix(prefix),
      returns: [
        ...prepauthTokenJWT.returns,
        {
          status: 200,
          type: "array",
          value: {
            type: "object",
            values: createReturns(useModel),
          },
        },
        {
          status: 400,
          error: "Filter not valid",
        },
        {
          status: 400,
          error: "Filter-Like operator can only be applied to strings",
        },
        {
          status: 400,
          error: "Filter could not be applied to field",
        },
        {
          status: 400,
          error: "Filter-operator not known",
        },
        {
          status: 400,
          error: "Filter cannot be in the path, too",
        },
      ],
    }
  );
  return getF;
};

module.exports = { generateGet };

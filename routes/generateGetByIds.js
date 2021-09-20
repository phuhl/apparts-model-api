const {
  createParams,
  nameFromPrefix,
  createReturns,
  checkAuth,
  createIdParam,
} = require("./common");
const { prepauthTokenJWT } = require("@apparts/types");

const generateGetByIds = (
  prefix,
  useModel,
  { access: authF, title, description },
  webtokenkey
) => {
  const getF = prepauthTokenJWT(webtokenkey)(
    {
      params: {
        ...createParams(prefix, useModel),
        ids: { type: "array", items: createIdParam(useModel) },
      },
    },
    async (req, me) => {
      await checkAuth(authF, req, me);

      const {
        dbs,
        params: { ids, ...restParams },
      } = req;

      const [Many] = useModel(dbs);
      const res = new Many();
      await res.load({ id: { op: "in", val: ids }, ...restParams });
      await res.generateDerived();
      return res.getPublic();
    },
    {
      title: title || "Get " + nameFromPrefix(prefix) + " by Ids",
      description,
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

module.exports = generateGetByIds;

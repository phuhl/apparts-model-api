const {
  createParams,
  nameFromPrefix,
  createReturns,
  checkAuth,
} = require("./common");
const { prepauthTokenJWT } = require("@apparts/types");

const generateGetByIds = (prefix, useModel, authF, webtokenkey) => {
  const getF = prepauthTokenJWT(webtokenkey)(
    {
      params: {
        ...createParams(prefix, useModel),
        ids: { type: "array_id" },
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
      return res.getPublic();
    },
    {
      title: "Get " + nameFromPrefix(prefix) + " by Ids",
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

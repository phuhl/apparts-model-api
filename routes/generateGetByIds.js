const { createParams, nameFromPrefix, createReturns } = require("./common");
const { prepauthTokenJWT } = require("@apparts/types");

const generateGetByIds = (prefix, useModel, authF, webtokenkey) => {
  const getF = prepauthTokenJWT(webtokenkey)(
    {
      params: {
        ...createParams(prefix, useModel),
        ids: { type: "array_id" },
      },
    },
    async ({ dbs, params: { ids, ...restParams } }) => {
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
      ],
    }
  );
  return getF;
};

module.exports = generateGetByIds;

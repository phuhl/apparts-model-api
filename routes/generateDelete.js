const { createParams, nameFromPrefix, keep } = require("./common");
const { IsReference } = require("@apparts/model");
const { HttpError } = require("@apparts/error");
const { prepauthTokenJWT } = require("@apparts/types");

const generateDelete = (prefix, useModel, authF, webtokenkey) => {
  const deleteF = prepauthTokenJWT(webtokenkey)(
    {
      params: {
        ...createParams(prefix, useModel),
        ids: { type: "array_id" },
      },
    },
    async ({ dbs, params: { ids, ...restParams } }) => {
      if (ids.length === 0) {
        return "ok";
      }

      const [Many] = useModel(dbs);
      const res = new Many();
      await res.load({ id: { op: "in", val: ids }, ...restParams });
      await keep(
        () => res.deleteAll(),
        IsReference,
        () =>
          new HttpError(
            412,
            "Could not delete as other items reference this item"
          )
      );

      return "ok";
    },
    {
      title: "Get " + nameFromPrefix(prefix) + " by Ids",
      returns: [
        { status: 200, value: "ok" },
        {
          status: 412,
          error: "Could not delete as other items reference this item",
        },
      ],
    }
  );
  return deleteF;
};

module.exports = generateDelete;

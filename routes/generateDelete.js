const {
  createParams,
  nameFromPrefix,
  checkAuth,
  createIdParam,
} = require("./common");
const { IsReference } = require("@apparts/model");
const { HttpError, fromThrows } = require("@apparts/error");
const { prepauthTokenJWT } = require("@apparts/types");

const generateDelete = (
  prefix,
  useModel,
  { access: authF, title, description },
  webtokenkey
) => {
  const deleteF = prepauthTokenJWT(webtokenkey)(
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

      if (ids.length === 0) {
        return "ok";
      }

      const [Many] = useModel(dbs);
      const res = new Many();
      await res.load({ id: { op: "in", val: ids }, ...restParams });
      await fromThrows(
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
      title: title || "Delete " + nameFromPrefix(prefix),
      description,
      returns: [
        { status: 200, value: "ok" },
        { status: 403, error: "You don't have the rights to retrieve this." },
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

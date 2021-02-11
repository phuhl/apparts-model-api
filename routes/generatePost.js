const { createParams, nameFromPrefix, reverseMap, keep } = require("./common");
const { HttpError } = require("@apparts/error");
const { prepauthTokenJWT } = require("@apparts/types");
const { DoesExist } = require("@apparts/model");

const createBody = (prefix, useModel) => {
  const params = createParams(prefix, useModel);
  const [Models] = useModel();
  const bodyParams = {};
  const types = Models.getTypes();
  for (const key in types) {
    const tipe = types[key];
    let name = key;
    if (tipe.public && !tipe.auto) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      if (!params[key]) {
        bodyParams[name] = { type: tipe.type, optional: tipe.optional };
      }
    }
  }
  return bodyParams;
};

const generatePost = (prefix, useModel, authF, webtokenkey) => {
  const postF = prepauthTokenJWT(webtokenkey)(
    {
      params: {
        ...createParams(prefix, useModel),
      },
      body: {
        ...createBody(prefix, useModel),
      },
    },
    async ({ dbs, params, body }) => {
      const [, One] = useModel(dbs);

      const types = One.getTypes();
      body = await keep(
        () => reverseMap(body, types),
        HttpError,
        (e) =>
          new HttpError(
            400,
            "Could not create item because your request had too many parameters",
            e.message
          )
      );

      for (const key of Object.keys(body)) {
        if (!types[key] || !types[key].public || types[key].auto) {
          return new HttpError(
            400,
            "Could not create item because your request had too many parameters",
            `"${key}" does not exist`
          );
        }
      }

      const model = new One({ ...body, ...params });
      await keep(
        () => model.store(),
        DoesExist,
        () => new HttpError(412, "Could not create item because it exists")
      );
      return model.content.id;
    },
    {
      title: "Create " + nameFromPrefix(prefix),
      returns: [
        {
          status: 200,
          type: "id",
        },
        {
          status: 400,
          error:
            "Could not create item because your request had too many parameters",
        },
        { status: 412, error: "Could not create item because it exists" },
      ],
    }
  );
  return postF;
};

module.exports = generatePost;

const { createParams, nameFromPrefix, reverseMap, keep } = require("./common");
const { HttpError } = require("@apparts/error");
const { prepauthTokenJWT } = require("@apparts/types");
const { NotFound } = require("@apparts/model");

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

const generatePut = (prefix, useModel, authF, webtokenkey) => {
  const putF = prepauthTokenJWT(webtokenkey)(
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
            "Could not alter item because your request had too many parameters",
            e.message
          )
      );

      for (const key of Object.keys(body)) {
        if (!types[key] || !types[key].public || types[key].auto) {
          return new HttpError(
            400,
            "Could not alter item because your request had too many parameters",
            `"${key}" does not exist`
          );
        }
      }

      const optionalsToBeRemoved = {};
      Object.keys(types)
        .filter(
          (key) =>
            !body[key] &&
            types[key].public &&
            (types[key].optional || types[key].default)
        )
        .forEach((key) => {
          optionalsToBeRemoved[key] = null;
        });

      const paramOverlap = Object.keys(body).filter((key) => params[key]);
      if (paramOverlap.length > 0) {
        return new HttpError(
          400,
          "Could not alter item because it would change a path id",
          paramOverlap
        );
      }

      const model = await keep(
        () => new One().load(params),
        NotFound,
        () => HttpError.notFound(nameFromPrefix(prefix))
      );
      model.content = { ...model.content, ...body, ...optionalsToBeRemoved };
      await model.update();
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
            "Could not alter item because your request had too many parameters",
        },
        {
          status: 400,
          error: "Could not alter item because it would change a path id",
        },
        { status: 404, error: nameFromPrefix(prefix) + " not found" },
      ],
    }
  );
  return putF;
};

module.exports = generatePut;

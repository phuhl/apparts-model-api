const { app, url, getPool } = require("@apparts/backend-test")({
  testName: "getByIds",
  apiVersion: 1,
  schemas: [
    `
CREATE TABLE model (
  id SERIAL PRIMARY KEY,
  "optionalVal" TEXT,
  "hasDefault" INT NOT NULL,
  mapped INT NOT NULL
);

CREATE TABLE submodel (
  id SERIAL PRIMARY KEY,
  "modelId" INT NOT NULL,
  FOREIGN KEY ("modelId") REFERENCES model(id)
);      `,
  ],
});

const request = require("supertest");
const {
  checkApiTypes: { checkType: _checkType, allChecked: _allChecked },
} = require("@apparts/types");
const { checkJWT, jwt } = require("../tests/checkJWT");
const { Model, useModel } = require("../tests/model.js");
const { SubModel, useSubModel } = require("../tests/submodel.js");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

describe("getByIds", () => {
  const path = "/v/1/model",
    auth = { getByIds: anybody };
  addCrud(path, app, useModel, auth, "rsoaietn0932lyrstenoie3nrst");
  const methods = generateMethods(path, useModel, auth, "");
  const checkType = (res, name) => _checkType(methods.get, res, name);
  checkJWT(() => request(app).get(url("model/[]")), "/:ids", checkType);

  test("Get all", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, {
      mapped: 10,
      optionalVal: "test",
    }).store();
    await new Model(dbs, { mapped: 11 }).store();
    const model3 = await new Model(dbs, { mapped: 12 }).store();
    const response = await request(app)
      .get(
        url("model/" + JSON.stringify([model3.content.id, model1.content.id]))
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: model1.content.id,
        optionalVal: "test",
        someNumber: model1.content.mapped,
      },
      {
        id: model3.content.id,
        someNumber: model3.content.mapped,
      },
    ]);
    expect(response.body.length).toBe(2);
    expect(checkType(response, "/:ids")).toBeTruthy();
  });
});

describe("getByIds subresources", () => {
  const path = "/v/1/model/:modelId/submodel",
    auth = { getByIds: anybody };
  addCrud(path, app, useSubModel, auth, "rsoaietn0932lyrstenoie3nrst");
  const methods = generateMethods(path, useSubModel, auth, "");
  const checkType = (res, name) => _checkType(methods.get, res, name);

  test("Get from subresouce", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 100 }).store();
    const model2 = await new Model(dbs, { mapped: 101 }).store();
    const submodel1 = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    const submodel3 = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    await new SubModel(dbs, {
      modelId: model2.content.id,
    }).store();

    const response = await request(app)
      .get(
        url(
          `model/${model1.content.id}/submodel/${JSON.stringify([
            submodel1.content.id,
            submodel3.content.id,
          ])}`
        )
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: submodel1.content.id,
        modelId: model1.content.id,
      },
      {
        id: submodel3.content.id,
        modelId: model1.content.id,
      },
    ]);
    expect(response.body.length).toBe(2);
    expect(checkType(response, "/:ids")).toBeTruthy();

    const response2 = await request(app)
      .get(
        url(
          `model/${model2.content.id}/submodel/${JSON.stringify([
            submodel1.content.id,
          ])}`
        )
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject([]);
    expect(response2.body.length).toBe(0);
    expect(checkType(response2, "/:ids")).toBeTruthy();
  });
});

describe("All possible responses tested", () => {
  const path = "/v/1/model/:modelId/submodel",
    auth = { getByIds: anybody };
  const methods = generateMethods(path, useSubModel, auth, "");
  const allChecked = (name) => _allChecked(methods.get, name);
  test("All possible responses tested", () => {
    expect(allChecked("/:ids")).toBeTruthy();
  });
});

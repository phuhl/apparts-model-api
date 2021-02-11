const { app: _app, url, error, getPool } = require("../tests")({
  testName: "delete",
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
  opt TEXT,
  FOREIGN KEY ("modelId") REFERENCES model(id)
);      `,
  ],
  apiVersion: 1,
});
const request = require("supertest");
const {
  checkApiTypes: { checkType: _checkType, allChecked: _allChecked },
} = require("@apparts/types");
const { checkJWT, jwt } = require("../tests/checkJWT");
const { Model, NoModel, useModel } = require("../tests/model.js");
const { SubModel, NoSubModel, useSubModel } = require("../tests/submodel.js");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const app = _app();

beforeEach(() => {});
afterEach(() => {});

describe("Delete", () => {
  const path = "/v/1/model",
    auth = { delete: anybody };
  addCrud(path, app, useModel, auth, "rsoaietn0932lyrstenoie3nrst");
  const methods = generateMethods(path, useModel, auth, "");
  const checkType = (res, name) => _checkType(methods.delete, res, name);
  checkJWT(
    () => request(app).delete(url("model/[1]")).send({ someNumber: 3 }),
    "/:ids",
    checkType
  );

  test("Delete", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, { mapped: 8 }).store();
    const response = await request(app)
      .delete(url("model/" + JSON.stringify([model.content.id])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    await new NoModel(dbs).loadNone({ id: model.content.id });
    expect(checkType(response, "/:ids")).toBeTruthy();
  });

  test("Delete multiple", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 8 }).store();
    const model2 = await new Model(dbs, { mapped: 8 }).store();
    const response = await request(app)
      .delete(
        url("model/" + JSON.stringify([model1.content.id, model2.content.id]))
      )
      .set("Authorization", "Bearer " + jwt());
    await new NoModel(dbs).loadNone({ id: model1.content.id });
    await new NoModel(dbs).loadNone({ id: model2.content.id });
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    expect(checkType(response, "/:ids")).toBeTruthy();
  });

  test("Delete none", async () => {
    const response = await request(app)
      .delete(url("model/" + JSON.stringify([])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    expect(checkType(response, "/:ids")).toBeTruthy();
  });

  test("Delete non existing model", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, {
      mapped: 11,
      optionalVal: null,
    }).store();
    const response = await request(app)
      .delete(url("model/[393939]"))
      .set("Authorization", "Bearer " + jwt());
    await new Model(dbs).loadById(model.content.id);
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    expect(checkType(response, "/:ids")).toBeTruthy();
  });

  test("Delete multiple, some don't exist", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 8 }).store();
    const model2 = await new Model(dbs, { mapped: 8 }).store();
    const response = await request(app)
      .delete(
        url(
          "model/" +
            JSON.stringify([model1.content.id, 9339939, model2.content.id])
        )
      )
      .set("Authorization", "Bearer " + jwt());
    await new NoModel(dbs).loadNone({ id: model1.content.id });
    await new NoModel(dbs).loadNone({ id: model2.content.id });
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    expect(checkType(response, "/:ids")).toBeTruthy();
  });
});

describe("Delete subresources", () => {
  const path = "/v/1/model/:modelId/submodel",
    auth = { delete: anybody };
  addCrud(path, app, useSubModel, auth, "rsoaietn0932lyrstenoie3nrst");
  const methods = generateMethods(path, useSubModel, auth, "");
  const checkType = (res, name) => _checkType(methods.delete, res, name);

  test("Delete a subresouce", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 100 }).store();
    const model2 = await new Model(dbs, { mapped: 101 }).store();
    const submodel = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    const submodel2 = await new SubModel(dbs, {
      modelId: model2.content.id,
    }).store();
    const response = await request(app)
      .delete(
        url(`model/${model1.content.id}/submodel/[${submodel.content.id}]`)
      )
      .set("Authorization", "Bearer " + jwt());
    await new NoSubModel(dbs).loadNone({ modelId: model1.content.id });
    const submodelNew = await new SubModel(dbs).load({
      modelId: model2.content.id,
    });
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    expect(submodelNew.content).toMatchObject({
      id: submodel2.content.id,
      modelId: model2.content.id,
    });
    expect(checkType(response, "/:ids")).toBeTruthy();
  });

  test("Delete reference of a a subresouce", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, { mapped: 100 }).store();
    const submodel = await new SubModel(dbs, {
      modelId: model.content.id,
    }).store();
    await new SubModel(dbs).loadById(submodel.content.id);
    await new Model(dbs).loadById(model.content.id);
    const response = await request(app)
      .delete(url(`model/[${model.content.id}]`))
      .set("Authorization", "Bearer " + jwt());

    expect(response.status).toBe(412);
    expect(response.body).toMatchObject(
      error("Could not delete as other items reference this item")
    );

    const submodelNew = await new SubModel(dbs).loadById(submodel.content.id);
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect(submodelNew.content).toMatchObject({
      id: submodel.content.id,
      modelId: model.content.id,
    });
    expect(modelNew.content).toMatchObject({
      id: model.content.id,
      mapped: model.content.mapped,
    });
    expect(checkType(response, "/:ids")).toBeTruthy();
  });
});

describe("All possible responses tested", () => {
  const path = "/v/1/model/:modelId/submodel",
    auth = { delete: anybody };
  const methods = generateMethods(path, useSubModel, auth, "");
  const allChecked = (name) => _allChecked(methods.delete, name);
  test("All possible responses tested", () => {
    expect(allChecked("/:ids")).toBeTruthy();
  });
});

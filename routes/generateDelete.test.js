const { NoModel, Model, useModel } = require("../tests/model.js");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const fName = "/:ids",
  auth = { delete: anybody };
const methods = generateMethods("/v/1/model", useModel, auth, "");

const {
  app,
  url,
  error,
  getPool,
  checkType,
  allChecked,
} = require("@apparts/backend-test")({
  testName: "delete",
  apiContainer: methods.delete,
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
const { checkJWT, jwt } = require("../tests/checkJWT");
const { SubModel, NoSubModel, useSubModel } = require("../tests/submodel.js");

describe("Delete", () => {
  const path = "/v/1/model";
  addCrud(path, app, useModel, auth, "rsoaietn0932lyrstenoie3nrst");

  checkJWT(
    () => request(app).delete(url("model/[1]")).send({ someNumber: 3 }),
    fName,
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
    checkType(response, fName);
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
    checkType(response, fName);
  });

  test("Delete none", async () => {
    const response = await request(app)
      .delete(url("model/" + JSON.stringify([])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    checkType(response, fName);
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
    checkType(response, fName);
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
    checkType(response, fName);
  });
});

describe("Check authorization", () => {
  const path = "/v/1/modelauth";
  addCrud(
    path,
    app,
    useModel,
    { delete: () => false },
    "rsoaietn0932lyrstenoie3nrst"
  );

  test("Should not grant access on no permission", async () => {
    const responseDel = await request(app)
      .delete(path + "/" + JSON.stringify([4]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseDel.status).toBe(403);
    expect(responseDel.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
    checkType(responseDel, fName);
  });
});

describe("Delete subresources", () => {
  const path = "/v/1/model/:modelId/submodel";
  addCrud(path, app, useSubModel, auth, "rsoaietn0932lyrstenoie3nrst");

  checkJWT(
    () =>
      request(app).delete(url("model/1/submodel/[2]")).send({ someNumber: 3 }),
    fName,
    checkType
  );

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
    checkType(response, fName);
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
    checkType(response, fName);
  });
});

test("All possible responses tested", () => {
  allChecked("/:ids");
});

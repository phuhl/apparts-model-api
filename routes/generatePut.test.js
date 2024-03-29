const { Model, useModel } = require("../tests/model.js");
const generatePut = require("./generatePut");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const fName = "/:id",
  auth = { put: { access: anybody } };
const methods = generateMethods("/v/1/model", useModel, auth, "");
const { app, url, error, getPool, checkType, allChecked } =
  require("@apparts/backend-test")({
    testName: "put",
    apiContainer: methods.put,
    schemas: [
      `
CREATE TABLE model (
  id SERIAL PRIMARY KEY,
  "optionalVal" TEXT,
  "hasDefault" INT NOT NULL,
  mapped INT NOT NULL
);

CREATE TABLE multikey (
  id INT NOT NULL,
  "key" TEXT NOT NULL,
  PRIMARY KEY (id, "key")
);

CREATE TABLE submodel (
  id SERIAL PRIMARY KEY,
  "modelId" INT NOT NULL,
  opt TEXT,
  FOREIGN KEY ("modelId") REFERENCES model(id)
);

CREATE TABLE advancedmodel (
  id SERIAL PRIMARY KEY,
  textarray text[],
  object json
);
CREATE TABLE strangeids (
  id VARCHAR(8) PRIMARY KEY,
  val INT NOT NULL
);
    `,
    ],
    apiVersion: 1,
  });
const request = require("supertest");
const { checkJWT, jwt } = require("../tests/checkJWT");
const { SubModel, useSubModel } = require("../tests/submodel.js");
const {
  AdvancedModel,
  useAdvancedModel,
} = require("../tests/advancedmodel.js");
const { StangeIdModel, useStangeIdModel } = require("../tests/strangeids.js");

describe("Put", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  checkJWT(
    () => request(app).put(url("model/1")).send({ someNumber: 3 }),
    "/:id",
    checkType
  );

  test("Put with too few values", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, { mapped: 7 }).store();
    const response = await request(app)
      .put(url("model/" + model.content.id))
      .send({})
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect({ ...model.content, optionalVal: null }).toMatchObject(
      modelNew.content
    );
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(error("Fieldmissmatch"));
    checkType(response, fName);
  });

  test("Put non-existing model", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, { mapped: 7 }).store();
    const response = await request(app)
      .put(url("model/" + (model.content.id + 1)))
      .send({
        someNumber: 99,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect({ ...model.content, optionalVal: null }).toMatchObject(
      modelNew.content
    );
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(error("Model not found"));
    checkType(response, fName);
  });

  test("Put", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, { mapped: 8 }).store();
    const response = await request(app)
      .put(url("model/" + model.content.id))
      .send({
        someNumber: 99,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect(response.body).toBe(model.content.id);
    expect(response.status).toBe(200);
    expect(modelNew.content).toMatchObject({
      mapped: 99,
      hasDefault: 7,
      optionalVal: null,
    });
    checkType(response, fName);
  });

  test("Put, set optional value", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, { mapped: 9 }).store();
    const response = await request(app)
      .put(url("model/" + model.content.id))
      .send({
        someNumber: 91,
        optionalVal: "testYes",
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).load({ optionalVal: "testYes" });
    expect(response.status).toBe(200);
    expect(response.body).toBe(model.content.id);
    expect(response.body).toBe(modelNew.content.id);
    expect(modelNew.content).toMatchObject({
      mapped: 91,
      hasDefault: 7,
      optionalVal: "testYes",
    });
    checkType(response, fName);
  });

  test("Put, remove optional value", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, {
      mapped: 10,
      optionalVal: "shouldBeGone",
    }).store();
    const response = await request(app)
      .put(url("model/" + model.content.id))
      .send({
        someNumber: 10,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect(response.status).toBe(200);
    expect(response.body).toBe(model.content.id);
    expect(modelNew.content).toMatchObject({
      mapped: 10,
      hasDefault: 7,
    });
    expect(modelNew.content.optionalVal).toBeFalsy();
    checkType(response, fName);
  });

  test("Put with non-public value", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, {
      mapped: 10,
      optionalVal: null,
    }).store();
    const response = await request(app)
      .put(url("model/" + model.content.id))
      .send({
        someNumber: 100,
        hasDefault: 10,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect(model.content).toMatchObject(modelNew.content);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not alter item because your request had too many parameters",
        '"hasDefault" does not exist'
      )
    );
    checkType(response, fName);
  });

  test("Put with non existing value", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, {
      mapped: 11,
      optionalVal: null,
    }).store();
    const response = await request(app)
      .put(url("model/" + model.content.id))
      .send({
        someNumber: 100,
        rubbish: true,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect(model.content).toMatchObject(modelNew.content);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not alter item because your request had too many parameters",
        '"rubbish" does not exist'
      )
    );
    checkType(response, fName);
  });

  test("Put with unmapped value", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, {
      mapped: 12,
      optionalVal: null,
    }).store();
    const response = await request(app)
      .put(url("model/" + model.content.id))
      .send({
        mapped: 100,
        someNumber: 100,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect(model.content).toMatchObject(modelNew.content);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not alter item because your request had too many parameters",
        '"mapped" does not exist'
      )
    );
    checkType(response, fName);
    const response2 = await request(app)
      .put(url("model/" + model.content.id))
      .send({
        mapped: 100,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew2 = await new Model(dbs).loadById(model.content.id);
    expect(model.content).toMatchObject(modelNew2.content);
    expect(response2.status).toBe(400);
    expect(response2.body).toMatchObject(error("Fieldmissmatch"));
    checkType(response2, fName);
  });
  test("Put with id", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, {
      mapped: 14,
      optionalVal: null,
    }).store();
    const response = await request(app)
      .put(url("model/" + model.content.id))
      .send({
        id: 1000,
        someNumber: 100,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect(model.content).toMatchObject(modelNew.content);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not alter item because your request had too many parameters",
        '"id" does not exist'
      )
    );
    checkType(response, fName);
  });
});

describe("Check authorization", () => {
  const path = "/v/1/modelauth";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: { put: { access: () => false } },
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should not grant access on no permission", async () => {
    const responsePut = await request(app)
      .put(path + "/4")
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(responsePut.status).toBe(403);
    expect(responsePut.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
    checkType(responsePut, fName);
  });
});

describe("Put subresources", () => {
  const path = "/v/1/model/:modelId/submodel";
  addCrud({
    prefix: path,
    app,
    model: useSubModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Put a subresouce", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 100 }).store();
    await new Model(dbs, { mapped: 101 }).store();
    const submodel = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    const response = await request(app)
      .put(url(`model/${model1.content.id}/submodel/${submodel.content.id}`))
      .send({ opt: "exists now" })
      .set("Authorization", "Bearer " + jwt());
    const submodelNew = await new SubModel(dbs).load({});
    expect(response.status).toBe(200);
    expect(response.body).toBe(submodel.content.id);
    expect(submodelNew.content).toMatchObject({
      id: submodel.content.id,
      modelId: model1.content.id,
      opt: "exists now",
    });
    checkType(response, fName);
  });

  test("Put a subresouce with correct id", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 100 }).store();
    const submodel = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    const response = await request(app)
      .put(url(`model/${model1.content.id}/submodel/${submodel.content.id}`))
      .send({ opt: "exists", modelId: model1.content.id })
      .set("Authorization", "Bearer " + jwt());
    const submodelNew = await new SubModel(dbs).loadById(submodel.content.id);
    expect(response.status).toBe(200);
    expect(response.body).toBe(submodel.content.id);
    expect(submodelNew.content).toMatchObject({
      id: submodel.content.id,
      modelId: model1.content.id,
      opt: "exists",
    });
    expect(submodel.content.opt).toBeFalsy();
    checkType(response, fName);
  });

  test("Put a subresouce with wrong id", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 100 }).store();
    const model2 = await new Model(dbs, { mapped: 101 }).store();
    const submodel = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    const response = await request(app)
      .put(url(`model/${model1.content.id}/submodel/${submodel.content.id}`))
      .send({ opt: "exists now", modelId: model2.content.id })
      .set("Authorization", "Bearer " + jwt());
    const submodelNew = await new SubModel(dbs).loadById(submodel.content.id);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Could not alter item because it would change a path id")
    );
    expect(submodelNew.content).toMatchObject({
      id: submodel.content.id,
      modelId: model1.content.id,
    });
    expect(submodel.content.opt).toBeFalsy();
    checkType(response, fName);
  });
});

describe("put advanced model", () => {
  const path = "/v/1/advancedmodel";

  addCrud({
    prefix: path,
    app,
    model: useAdvancedModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should update model", async () => {
    const dbs = getPool();
    const model1 = await new AdvancedModel(dbs, {
      textarray: ["erster", "zweiter"],
      object: { a: 22, bcd: "jup" },
    }).store();

    const response = await request(app)
      .put(url(`advancedmodel/` + model1.content.id))
      .send({
        textarray: ["dritter", "vierter"],
        object: { a: 23, bcd: "nope" },
      })
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toBe(model1.content.id);
    const modelNew = await new AdvancedModel(dbs).loadById(model1.content.id);
    expect(modelNew.content).toMatchObject({
      textarray: ["dritter", "vierter"],
      object: { a: 23, bcd: "nope" },
    });
    checkType(response, fName);
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generatePut("model", useModel, {}, "").options;
    const options2 = generatePut(
      "model",
      useModel,
      { title: "My title", description: "yay" },
      ""
    ).options;
    expect(options1.description).toBeFalsy();
    expect(options1.title).toBe("Alter Model");
    expect(options2.title).toBe("My title");
    expect(options2.description).toBe("yay");
  });
});

describe("Ids of other format", () => {
  const path = "/v/1/strangemodel";
  addCrud({
    prefix: path,
    app,
    model: useStangeIdModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });
  const methods2 = generateMethods(path, useStangeIdModel, auth, "");

  it("should put with other id format", async () => {
    methods.put[fName] = methods2.put[fName];
    const dbs = getPool();
    const model1 = await new StangeIdModel(dbs, {
      id: "test1",
      val: 1,
    }).store();
    const response = await request(app)
      .put(url("strangemodel/" + model1.content.id))
      .send({ val: 2 })
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("test1");
    expect(response.status).toBe(200);
    const model2 = await new StangeIdModel(dbs).load({
      id: "test1",
    });
    expect(model2.content).toMatchObject({
      id: "test1",
      val: 2,
    });
    checkType(response, fName);
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});

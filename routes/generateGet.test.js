const { app: _app, url, error, getPool } = require("@apparts/backend-test")({
  testName: "get",
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

const app = _app();

beforeEach(() => {});
afterEach(() => {});

describe("Get", () => {
  const path = "/v/1/model",
    auth = { get: anybody };
  addCrud(path, app, useModel, auth, "rsoaietn0932lyrstenoie3nrst");
  const methods = generateMethods(path, useModel, auth, "");
  const checkType = (res, name) => _checkType(methods.get, res, name);
  checkJWT(() => request(app).get(url("model")), "", checkType);

  test("Get all", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, {
      mapped: 10,
      optionalVal: "test",
    }).store();
    const model2 = await new Model(dbs, { mapped: 11 }).store();
    const response = await request(app)
      .get(url("model"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: model1.content.id,
        someNumber: 10,
        optionalVal: "test",
      },
      {
        id: model2.content.id,
        someNumber: 11,
      },
    ]);
    expect(checkType(response, "")).toBeTruthy();
  });

  test("Get paginated", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 20 }).store();
    const response = await request(app)
      .get(url("model", { limit: 2 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);

    expect(response.body).toMatchObject([
      {
        someNumber: 10,
        optionalVal: "test",
      },
      {
        someNumber: 11,
      },
    ]);

    const response2 = await request(app)
      .get(url("model", { limit: 2, offset: 2 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject([
      {
        id: model1.content.id,
        someNumber: 20,
      },
    ]);
    const response3 = await request(app)
      .get(url("model", { limit: 2, offset: 4 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response3.status).toBe(200);
    expect(response3.body).toMatchObject([]);

    expect(checkType(response, "")).toBeTruthy();
    expect(checkType(response2, "")).toBeTruthy();
    expect(checkType(response3, "")).toBeTruthy();
  });

  test("Get with malformated filter", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: "garbidge",
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(error("Filter not valid"));
    expect(checkType(response, "")).toBeTruthy();
  });

  test("Get with filter with unknown keys", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ dummy: 33 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Filter could not be applied to field", '"dummy" does not exist')
    );
    expect(checkType(response, "")).toBeTruthy();
  });

  test("Get with filter with unknown operator", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ optionalVal: { gt: 30 } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Filter-operator not known", 'Unknown operators: "gt"')
    );
    expect(checkType(response, "")).toBeTruthy();
  });

  test("Get with filter on mapped type", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, {
      mapped: 30,
    }).store();

    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ someNumber: 30 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        id: model1.content.id,
        someNumber: 30,
      },
    ]);
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(checkType(response, "")).toBeTruthy();
  });

  test("Get with filter with like operator on non-string", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ someNumber: { like: "test" } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    const response2 = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ optionalVal: { like: 30 } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Filter-Like operator can only be applied to strings")
    );
    expect(response2.status).toBe(400);
    expect(response2.body).toMatchObject(
      error("Filter-Like operator can only be applied to strings")
    );
    expect(checkType(response, "")).toBeTruthy();
  });

  test("Get with filter on non-public type", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ hasDefault: 30 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Filter could not be applied to field",
        '"hasDefault" does not exist'
      )
    );
    expect(checkType(response, "")).toBeTruthy();
  });

  test("Get filtered", async () => {
    const dbs = getPool();
    await new Model(dbs, {
      mapped: 30,
      optionalVal: "cheap",
    }).store();
    const model2 = await new Model(dbs, {
      mapped: 11,
      optionalVal: "dirty",
    }).store();
    const response = await request(app)
      .get(
        url("model", {
          filter: encodeURIComponent(
            JSON.stringify({ optionalVal: { like: "%rty" } })
          ),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        id: model2.content.id,
        optionalVal: "dirty",
      },
    ]);
    expect(response.body.length).toBe(1);
    expect(response.status).toBe(200);
    expect(checkType(response, "")).toBeTruthy();
  });
});

describe("get subresources", () => {
  const path = "/v/1/model/:modelId/submodel",
    auth = { get: anybody };
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

    const response = await request(app)
      .get(url(`model/${model1.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: submodel1.content.id,
        modelId: model1.content.id,
      },
    ]);
    expect(response.body.length).toBe(1);
    expect(checkType(response, "")).toBeTruthy();

    const response2 = await request(app)
      .get(url(`model/${model2.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject([]);
    expect(response2.body.length).toBe(0);
    expect(checkType(response2, "")).toBeTruthy();

    await new SubModel(dbs, {
      modelId: model2.content.id,
    }).store();
    const response3 = await request(app)
      .get(
        url(`model/${model1.content.id}/submodel`, {
          filter: JSON.stringify({
            modelId: model2.content.id,
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response3.status).toBe(400);
    expect(response3.body).toMatchObject(
      error("Filter cannot be in the path, too", 'param: "modelId"')
    );
    expect(checkType(response3, "")).toBeTruthy();
  });
});

describe("All possible responses tested", () => {
  const path = "/v/1/model/:modelId/submodel",
    auth = { get: anybody };
  const methods = generateMethods(path, useSubModel, auth, "");
  const allChecked = (name) => _allChecked(methods.get, name);
  test("All possible responses tested", () => {
    expect(allChecked("")).toBeTruthy();
  });
});

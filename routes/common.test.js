const { app, url, error, getPool } = require("@apparts/backend-test")({
  testName: "common",
  apiContainer: { dummy: 1 },
  apiVersion: 1,
  schemas: [
    `
    CREATE TABLE model (
      id SERIAL PRIMARY KEY,
      "optionalVal" TEXT,
      "hasDefault" INT NOT NULL,
      mapped INT NOT NULL
    );`,
  ],
});
const request = require("supertest");
const { useChecks } = require("@apparts/types");
const { checkJWT, jwt } = require("../tests/checkJWT");
const { Model, useModel } = require("../tests/model.js");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

describe("Anybody", () => {
  const path = "/v/1/model",
    auth = { get: anybody };
  addCrud(path, app, useModel, auth, "rsoaietn0932lyrstenoie3nrst");
  const methods = generateMethods(path, useModel, auth, "");
  const fName = "";
  const { checkType } = useChecks(methods.get);
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
    checkType(response, fName);
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

    checkType(response, fName);
    checkType(response2, fName);
    checkType(response3, fName);
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
    checkType(response, fName);
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
    checkType(response, fName);
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
    checkType(response, fName);
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
    checkType(response, fName);
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
    checkType(response, fName);
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
    checkType(response, fName);
  });

  test("Get with filter wrong type", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ optionalVal: 77 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Filter could not be applied to field",
        'Parameter "optionalVal" has wrong type'
      )
    );
    checkType(response, fName);
  });

  test("Get with mapped filter wrong type", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ someNumber: "77" }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Filter could not be applied to field",
        'Parameter "someNumber" has wrong type'
      )
    );
    checkType(response, fName);
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
    checkType(response, fName);
  });
});

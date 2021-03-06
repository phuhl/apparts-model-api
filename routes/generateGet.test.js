const { Model, useModel } = require("../tests/model.js");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const fName = "",
  auth = { get: anybody };
const methods = generateMethods("/v/1/model", useModel, auth, "");

const {
  app,
  url,
  error,
  getPool,
  checkType,
  allChecked,
} = require("@apparts/backend-test")({
  testName: "get",
  apiContainer: methods.get,
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
const { checkJWT, jwt } = require("../tests/checkJWT");
const { SubModel, useSubModel } = require("../tests/submodel.js");

describe("Get", () => {
  const path = "/v/1/model";
  addCrud(path, app, useModel, auth, "rsoaietn0932lyrstenoie3nrst");
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
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
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
      error("Fieldmissmatch", 'expected object for field "filter" in query')
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
      error("Fieldmissmatch", 'expected object for field "filter" in query')
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
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    expect(response2.status).toBe(400);
    expect(response2.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
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
      error("Fieldmissmatch", 'expected object for field "filter" in query')
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
      error("Fieldmissmatch", 'expected object for field "filter" in query')
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
      error("Fieldmissmatch", 'expected object for field "filter" in query')
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

describe("Check authorization", () => {
  const path = "/v/1/modelauth";
  addCrud(
    path,
    app,
    useModel,
    { get: () => false },
    "rsoaietn0932lyrstenoie3nrst"
  );

  test("Should not grant access on no permission", async () => {
    const responseGet = await request(app)
      .get(path)
      .set("Authorization", "Bearer " + jwt());
    expect(responseGet.status).toBe(403);
    expect(responseGet.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
    checkType(responseGet, fName);
  });
});

describe("get subresources", () => {
  const path = "/v/1/model/:modelId/submodel";
  addCrud(path, app, useSubModel, auth, "rsoaietn0932lyrstenoie3nrst");
  const methods2 = generateMethods(path, useSubModel, auth, "");

  test("Get from subresouce", async () => {
    // This makes allChecked (at the end) think, these tests operate
    // on the same function as the ones from above. I can't let them
    // run on the same function as the returns are slightly different.
    // Little hacky but I don't want to rewrite all tests.
    methods.get[fName] = methods2.get[fName];

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
    checkType(response, fName);

    const response2 = await request(app)
      .get(url(`model/${model2.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject([]);
    expect(response2.body.length).toBe(0);
    checkType(response2, fName);

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
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response3, fName);
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});

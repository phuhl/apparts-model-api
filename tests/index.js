const connect = require("@apparts/db");

const error = (error, description) =>
  description ? { error, description } : { error };

const url = (api) => (postfix, query) => {
  let queryparams = "";
  if (query) {
    queryparams =
      "?" +
      Object.keys(query)
        .map((key) => `${key}=${query[key]}`)
        .join("&");
  }
  return `/v/${api}/${postfix}${queryparams}`;
};

const runDBQuery = (DB_CONFIG) => async (queryRunner) => {
  const dbs = await new Promise((res, rej) => {
    connect(DB_CONFIG, (e, dbs) => {
      if (e) {
        console.log(e);
        rej(e);
      }
      res(dbs);
    });
  });
  const result = await queryRunner(dbs);
  await new Promise((res) => {
    dbs.shutdown(() => {
      res();
    });
  });
  return result;
};

const pSetupquery = async (databasePreparations) => {
  let query = "";
  for (const preparation of databasePreparations) {
    query += await preparation();
  }
  return query;
};

const testapp = require("../test-app");

const {
  checkApiTypes: { checkType: _checkType, allChecked: _allChecked },
} = require("@apparts/types");

const { setup, teardown, getPool } = require("./database");

module.exports = ({
  apiContainer,
  apiVersion = 1,
  schemas = [],
  databasePreparations = [],
  testName,
}) => {
  if (!apiVersion || !testName) {
    throw new Error(
      '"apiVersion" or "testName" missing in @apparts/backend-test'
    );
  }

  const databaseName = apiVersion + "_" + testName;
  const DB_CONFIG = { ...require("@apparts/config").get("db-test-config") };
  DB_CONFIG.postgresql.db = databaseName;

  const app = testapp(DB_CONFIG);

  if (!Array.isArray(databasePreparations)) {
    databasePreparations = [databasePreparations];
  }

  beforeAll(async () => {
    await require("../test-app.js").shutdown();

    const setupquery = await pSetupquery(databasePreparations);
    try {
      await setup(schemas, setupquery, databaseName);
    } catch (e) {
      console.log("Error in setup:", e);
      throw e;
    }
  }, 60000);

  afterAll(async () => {
    await teardown(databaseName);
    await testapp.shutdown();

    // avoid jest open handle error
    // https://github.com/visionmedia/supertest/issues/520#issuecomment-469044925
    await new Promise((resolve) => setTimeout(() => resolve(), 500));
  }, 60000);

  return {
    checkType: (res, name) => _checkType(apiContainer, res, name),
    allChecked: (res, name) => _allChecked(apiContainer, res, name),
    app,
    url: url(apiVersion),
    error,
    runDBQuery: runDBQuery(DB_CONFIG),
    getPool,
  };
};

module.exports.error = error;

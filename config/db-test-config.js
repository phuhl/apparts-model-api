module.exports = {
  use: "postgresql",
  postgresql: {
    host: "localhost",
    port: 5433,
    user: "postgres",
    pw: "",
    db: "appartsmodeltests",
    maxPoolSize: 1,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    bigIntAsNumber: true,
  },
};

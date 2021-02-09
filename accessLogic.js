// check all conditions in parallel
const and = (...fs) => async (...params) =>
  await Promise.all(fs.map((f) => f(...params)));
const or = (...fs) => async (...params) =>
  await Promise.race(fs.map((f) => f(...params)));

// check all conditions in sequence
const andS = (...fs) => async (...params) =>
  await fs.reduce(
    async (a, b) => (await a) && (await b()),
    Promise.resolve(true)
  );
const orS = (...fs) => async (...params) =>
  await fs.reduce(
    async (a, b) => (await a) || (await b()),
    Promise.resolve(false)
  );

// anybody
const anybody = () => true;

module.exports = { and, andS, or, orS, anybody };

const { useModel, makeModel } = require("@apparts/model");

const types = {
  id: {
    type: "id",
    public: true,
    auto: true,
    key: true,
  },
  textarray: {
    type: "array",
    items: { type: "string" },
    public: true,
  },
  object: {
    type: "object",
    keys: {
      a: { type: "int" },
      bcd: { type: "string" },
    },
    public: true,
  },
};

const [Models, Model, NoModel] = useModel(types, "advancedmodel");

module.exports = makeModel("AdvancedModel", [Models, Model, NoModel]);

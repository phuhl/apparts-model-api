const { useModel, makeModel } = require("@apparts/model");

const types = {
  id: {
    type: "id",
    public: true,
    auto: true,
    key: true,
  },
  optionalVal: {
    type: "string",
    optional: true,
    public: true,
  },
  hasDefault: {
    type: "int",
    default: 7,
    public: true,
  },
  mapped: {
    type: "int",
    mapped: "someNumber",
    public: true,
  },
};

const [Models, Model, NoModel] = useModel(types, "model");

module.exports = makeModel("ModelWithDefault", [Models, Model, NoModel]);

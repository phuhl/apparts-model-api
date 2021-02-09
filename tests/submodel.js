const { useModel, makeModel } = require("@apparts/model");

const types = {
  id: {
    type: "id",
    public: true,
    auto: true,
    key: true,
  },
  modelId: {
    type: "id",
    public: true,
  },
};

const [Models, Model, NoModel] = useModel(types, "submodel");

module.exports = makeModel("SubModel", types, [Models, Model, NoModel]);

class SerializableFieldsMap {
  fields = /* @__PURE__ */ new Map();
  set(component, property) {
    this.fields.set(`${component.constructor.name}-${property}`, true);
  }
  get(component, property) {
    return this.fields.get(`${component.constructor.name}-${property}`);
  }
  has(component, property) {
    return this.fields.has(`${component.constructor.name}-${property}`);
  }
}
const SerializableFields = new SerializableFieldsMap();
function SerializeField(value, context) {
  context.enumerable = true;
  context.addInitializer(function() {
    SerializableFields.set(this, context.name);
  });
  if (context.kind === "field") {
    return;
  }
  return value;
}

export { SerializableFields, SerializableFieldsMap, SerializeField };

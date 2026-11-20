export const models = {
  solo: { seats: 1, rated: 110, packed: "90 × 36 × 30 cm", open: "330 × 72 cm", weight: "10.8 kg", price: 28800 },
  tandem: { seats: 2, rated: 205, packed: "106 × 41 × 34 cm", open: "370 × 77 cm", weight: "14.6 kg", price: 36800 },
};
export const equipment = { paddle: 1800, vest: 1450, bag: 680 };
export const keys = Object.keys(equipment);
export const limit = (key, people) => key === "bag" ? 2 : people;

export function inspectKit({ model, people, route, load, counts }) {
  const hull = models[model];
  if (hull.seats !== people) return { field: "model", code: "seats" };
  if (route === "coast") return { field: "route", code: "coast" };
  if (!Number.isFinite(load) || load < 1 || Math.round(load * 10) / 10 !== load) return { field: "load", code: "load" };
  if (load > hull.rated) return { field: "load", code: "rating" };
  const excess = keys.find(key => !Number.isInteger(counts[key]) || counts[key] < 0 || counts[key] > limit(key, people));
  if (excess) return { field: excess, code: "quantity" };
  return { total: hull.price + keys.reduce((sum, key) => sum + counts[key] * equipment[key], 0) };
}

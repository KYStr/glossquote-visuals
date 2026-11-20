import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const copy = {
  en: {
    pool: ["Pool Walk", "0.6 km", "35 min", "Spare socks"],
    shelf: ["Rock Shelf Walk", "1.2 km", "60 min", "Light rain jacket"],
    ridge: ["Ridgeline Walk", "1.8 km", "75 min", "Sun hat"],
    heading: "Your trip checklist",
    labels: ["Coastal walks", "Group size (including you)", "Round trip", "Walking time", "Terrain", "Essential gear", "Extra gear"],
    extra: "Field notebook, Dry bag",
    empty: "None selected",
    otherGear: "Binoculars",
    terrain: "Uneven shelf, low ledges",
    required: "Closed-toe grippy shoes, Drinking water, Light rain jacket",
    note: "Illustrative walk. Check official tide times and local site access before leaving.",
  },
  "zh-Hant": {
    pool: ["潮池短線", "0.6 公里", "35 分鐘", "備用襪"],
    shelf: ["岩棚環視", "1.2 公里", "60 分鐘", "輕便雨衣"],
    ridge: ["望潮高徑", "1.8 公里", "75 分鐘", "遮陽帽"],
    heading: "你的行前單",
    labels: ["觀察路線", "同行人數（含自己）", "來回距離", "步行時間", "地形", "必備裝備", "自選裝備"],
    extra: "觀察筆記本、防水袋",
    empty: "未勾選",
    otherGear: "望遠鏡",
    terrain: "不平岩棚、短階差",
    required: "包覆式防滑鞋、飲用水、輕便雨衣",
    note: "路線為示意。出發前請查官方潮汐與現場開放資訊。",
  },
};

export async function setMaterial(page, state, input) {
  assert.ok([0, 1, 2].includes(state));
  const stage = page.locator("[data-stage]");
  const button = page.locator(`button[data-tide="${state}"]`);
  await button.waitFor();
  if (input === "touch") {
    await button.tap();
  } else {
    assert.equal(input, "keyboard");
    await button.focus();
    await button.press("Enter");
  }
  assert.equal(await button.getAttribute("aria-pressed"), "true");
  assert.equal(await stage.getAttribute("data-tide"), String(state));
  await stage.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return { state, input, phase: await stage.getAttribute("data-motion") };
}

export async function testFlow(page, lang) {
  const expected = copy[lang];
  assert.ok(expected, `Unexpected language ${lang}`);
  assert.equal(await page.locator("html").getAttribute("lang"), lang);
  const form = page.locator("[data-plan-form]");
  const select = form.locator("select[name=route]");
  const group = form.locator("input[name=group]");
  const submit = form.locator("button[type=submit]");
  const review = page.locator("[data-preview]");
  const pick = (id) => page.locator(`[data-pick="${id}"]`);
  const gear = (id) => form.locator(`[name=gear][value="${id}"]`);
  const value = (key) => review.locator(`[data-trip="${key}"]`).textContent();
  const checkWalk = async (id) => {
    const [, distance, duration, essential] = expected[id];
    assert.equal(await select.inputValue(), id);
    const walking = await form.locator("[data-walking]").textContent();
    assert.ok(walking.includes(distance) && walking.includes(duration), walking);
    assert.ok((await form.locator("[data-needed]").textContent()).includes(essential));
  };

  await form.waitFor();
  await checkWalk("pool");
  await pick("ridge").click();
  await checkWalk("ridge");
  await select.selectOption("pool");
  await checkWalk("pool");
  await select.selectOption("shelf");
  await checkWalk("shelf");

  const rejected = [];
  for (const count of ["0", "9", "1.5", ""]) {
    await group.fill(count);
    await submit.click();
    assert.equal(await group.evaluate((input) => input.validity.valid), false);
    assert.equal(await review.isVisible(), false);
    rejected.push(count);
  }

  await group.fill("1");
  await gear("binoculars").check();
  await submit.click();
  await review.waitFor();
  assert.equal(await value("route"), expected.shelf[0]);
  assert.equal(await value("group"), "1");
  assert.equal(await value("extras"), expected.otherGear);

  await review.locator("[data-edit]").click();
  assert.equal(await group.inputValue(), "1");
  assert.equal(await gear("binoculars").isChecked(), true);
  await gear("binoculars").uncheck();
  await select.selectOption("ridge");
  await checkWalk("ridge");
  await group.fill("8");
  await submit.click();
  assert.equal(await value("group"), "8");
  assert.equal(await value("extras"), expected.empty);

  await review.locator("[data-edit]").click();
  await pick("shelf").click();
  await checkWalk("shelf");
  assert.equal(await group.inputValue(), "8");
  await gear("notebook").check();
  await gear("bag").check();
  await submit.click();

  const details = [expected.shelf[0], "8", ...expected.shelf.slice(1, 3), expected.terrain, expected.required, expected.extra];
  assert.deepEqual(await review.locator("[data-trip]").allTextContents(), details);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    review.locator("[data-download]").click(),
  ]);
  assert.equal(await download.failure(), null);
  const filename = download.suggestedFilename();
  assert.equal(filename, `tide-table-${lang}.txt`);
  const buffer = await readFile(await download.path());
  const exported = buffer.toString("utf8");
  const separator = lang === "en" ? ": " : "：";
  assert.equal(exported, [
    "TIDE TABLE — " + expected.heading, "",
    ...expected.labels.map((label, i) => label + separator + details[i]), "", expected.note, "",
  ].join("\n"));
  return { lang, rejected, accepted: [1, 8], routes: ["pool", "ridge", "shelf"], filename, bytes: buffer.length, exported };
}

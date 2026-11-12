import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { observe } from "./probe.mjs";

export async function checkPaperCommercial({ browser, withPage, open, screenshot, site, work }) {
  const cases = [
    { prefix: "", label: "zh", width: 390, touch: true, purpose: "品牌禮盒附手寫小卡 <紙與光>" },
    { prefix: "en/", label: "en", width: 1440, touch: false, purpose: "A gift box with a handwritten note <Paper & Light>" },
  ];

  for (const { prefix, label, width, touch, purpose } of cases) {
    await withPage(browser, { viewport: { width, height: 850 }, hasTouch: touch, reducedMotion: "reduce", acceptDownloads: true }, async (page) => {
      const probe = await observe(page);
      await open(page, prefix + work);
      const form = page.locator("[data-brief-form]");
      await form.waitFor({ state: "visible" });
      const stock = form.locator("#stock");
      const finish = form.locator("#finish");
      const series = form.locator("#collection");
      const quantity = form.locator("#quantity");
      const use = form.locator("#purpose");
      const review = form.locator('[type="submit"]');
      const summary = page.locator("[data-brief-summary]");

      if (touch) {
        const paper = page.locator("[data-stage]");
        await paper.tap({ position: { x: 95, y: 50 } });
        await page.waitForFunction(() => Number(document.querySelector("#light-angle").value) === 44);
        assert.match(await paper.evaluate((element) => getComputedStyle(element).touchAction), /pan-y/);
      }

      for (const [id, stockValue, finishValue, count] of [
        ["invites", "smooth", "ink", "25"], ["cards", "cotton", "deboss", "50"], ["gifts", "recycled", "ink", "30"],
      ]) {
        const entry = page.locator(`[data-collection="${id}"]`);
        if (touch) await entry.tap();
        else {
          await entry.focus();
          await page.keyboard.press("Enter");
        }
        assert.equal(await series.inputValue(), id);
        assert.equal(await stock.inputValue(), stockValue);
        assert.equal(await finish.inputValue(), finishValue);
        assert.equal(await quantity.inputValue(), count);
        assert.equal(await quantity.getAttribute("min"), count);
      }

      for (const invalid of ["", "29", "30.5", "10001"]) {
        await quantity.fill(invalid);
        await review.click();
        assert.equal(await quantity.getAttribute("aria-invalid"), "true");
        assert.equal(await page.locator("#quantity-error").isVisible(), true);
        assert.equal(await quantity.evaluate((node) => node === document.activeElement), true);
      }
      await quantity.fill("35");
      await use.fill("   ");
      await review.click();
      assert.equal(await page.locator("#purpose-error").isVisible(), true);
      assert.equal(await use.evaluate((node) => node === document.activeElement), true);

      await stock.selectOption("cotton");
      await finish.selectOption("both");
      await use.fill(purpose);
      await review.focus();
      await page.keyboard.press("Enter");
      assert.equal(await form.isVisible(), false);
      assert.equal(await summary.locator("h3").evaluate((node) => node === document.activeElement), true);
      assert.equal(await summary.locator('[data-value="purpose"]').textContent(), purpose);
      assert.equal(await summary.locator('[data-value="purpose"] *').count(), 0);

      await summary.locator("[data-edit]").focus();
      await page.keyboard.press("Enter");
      assert.equal(await series.evaluate((node) => node === document.activeElement), true);
      assert.equal(await stock.inputValue(), "cotton");
      assert.equal(await finish.inputValue(), "both");
      assert.equal(await quantity.inputValue(), "35");
      assert.equal(await use.inputValue(), purpose);
      await quantity.fill("250");
      await review.click();

      const receipt = await summary.locator("dd").allTextContents();
      const extra = await page.locator("[data-quote]").getAttribute("data-extra-lead");
      const both = await page.locator("[data-quote]").getAttribute("data-both-lead");
      assert.equal(receipt[3], "250");
      assert.ok(receipt[5].includes(extra) && receipt[5].includes(both));
      assert.equal(await summary.locator("[data-complete]").textContent(), "");

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        summary.locator("[data-download]").click(),
      ]);
      assert.equal(download.suggestedFilename(), "paper-and-light-print-brief.txt");
      assert.equal(await download.failure(), null);
      const downloaded = await readFile(await download.path(), "utf8");
      const headings = await summary.locator("dt").allTextContents();
      const title = await page.locator("[data-quote]").getAttribute("data-document-title");
      const complete = await summary.locator("[data-complete]").textContent();
      assert.match(complete, label === "zh" ? /尚未送出訂單/ : /No order has been placed/);
      assert.equal(downloaded, "\uFEFF" + [title, "", ...headings.map((heading, i) => heading + " — " + receipt[i]), "", complete, ""].join("\r\n"));
      await screenshot(page, `paper-${label}-${width}-brief-complete.png`);
      await probe.assertPrivate(site.origin);
    });
  }
}

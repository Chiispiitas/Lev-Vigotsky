const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium, webkit, devices } = require(process.env.EXAM_PLAYWRIGHT || "playwright");

const root = path.resolve(__dirname, "..");
const artifacts = process.env.EXAM_QA_DIR || path.resolve(root, "..", "ueplv-exam-qa");
const release = JSON.parse(fs.readFileSync(path.join(__dirname, "answer-keys", "version.json")));
const version = Object.keys(release).includes("currentVersion") ? release.currentVersion : release.version;
const json = file => JSON.parse(fs.readFileSync(path.join(__dirname, file)));
const ids = ["a1", "a2", "b1"].flatMap(level => ["a", "b"].map(form => level + "-practice-" + form));
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".mp3": "audio/mpeg",
  ".webp": "image/webp", ".pdf": "application/pdf", ".png": "image/png", ".svg": "image/svg+xml"
};

function serve(request, response) {
  const relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^[/\\]+/, "");
  const file = path.resolve(root, relative.endsWith("/") ? relative + "index.html" : relative);
  if (!file.startsWith(root + path.sep) || !/^(English|assets|site\.css)([/\\]|$)/.test(relative) ||
      !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return response.writeHead(404).end();
  }
  const total = fs.statSync(file).size;
  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || "");
  const start = range ? Number(range[1]) : 0;
  const end = range && range[2] ? Math.min(total - 1, Number(range[2])) : total - 1;
  if (start > end) return response.writeHead(416, { "Content-Range": "bytes */" + total }).end();
  const headers = {
    "Content-Type": mime[path.extname(file)] || "application/octet-stream",
    "Content-Length": end - start + 1, "Accept-Ranges": "bytes"
  };
  if (range) headers["Content-Range"] = "bytes " + start + "-" + end + "/" + total;
  response.writeHead(range ? 206 : 200, headers);
  if (request.method === "HEAD") return response.end();
  fs.createReadStream(file, { start, end }).pipe(response);
}

async function contextFor(browser, sizes) {
  const context = await browser.newContext({ ...sizes, acceptDownloads: true });
  return context;
}

function mockReceipt(payload, key) {
  const sections = [];
  const items = [];
  for (const section of key.sections) {
    let score = 0;
    for (const item of section.items) {
      const answer = payload.answers[item.id] || "";
      const correct = item.answers.includes(answer);
      if (correct) score++;
      items.push({ id: item.id, section: section.id, studentAnswer: answer,
        correctAnswers: item.answers, correct, score: Number(correct), maxScore: 1 });
    }
    sections.push({ id: section.id, score, maxScore: section.items.length });
  }
  return {
    attemptId: payload.attemptId, examId: payload.examId, keyVersion: payload.keyVersion,
    score: sections.reduce((sum, row) => sum + row.score, 0), maxScore: items.length, sections, items,
    submittedAt: "2026-11-23T12:00:00.000Z"
  };
}

async function ensureFits(page) {
  const hasOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > innerWidth + 1 ||
    [...document.querySelectorAll(".main-content, .player-header, #nextBtn, #timer")].some(el => {
      const box = el.getBoundingClientRect();
      return box.width && (box.left < -1 || box.right > innerWidth + 1 || el.clientWidth && el.scrollWidth > el.clientWidth + 1);
    })
  );
  assert.equal(hasOverflow, false, "horizontal document overflow");
}

async function runPaper(browser, base, id, sizes, engine, { submissionError = false, shot = false, audioCheck = false } = {}) {
  const paper = json("content/exams/" + id + ".json");
  const key = json("answer-keys/versions/" + version + "/" + id + ".json");
  const answers = key.sections.flatMap(section => section.items);
  const context = await contextFor(browser, sizes);
  const calls = [];
  let result;
  const blocked = [];
  await context.route("**/*", async route => {
    const req = route.request();
    if (req.method() === "POST" && req.url().endsWith("/api/assessment/submit")) {
      const body = req.postDataJSON();
      calls.push(body);
      const headers = { "access-control-allow-origin": "*", "content-type": "application/json" };
      if (submissionError && calls.length === 1) {
        await route.fulfill({ status: 503, headers, json: { error: "Try again shortly." } });
        return;
      }
      result = mockReceipt(body, key);
      await route.fulfill({ status: 201, headers, json: result });
      return;
    }
    if (req.method() !== "GET" && req.method() !== "HEAD") {
      blocked.push(req.url());
      await route.abort();
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(base + "practice.html?exam=" + id);
    await page.locator("#studentName").fill("QA Fictional Student");
    if (paper.level !== "A1") await page.locator("#studentGroup").selectOption("science");
    await page.locator("#startBtn").click();
    assert.equal(await page.locator("#timer").innerText(), paper.minutes + ":00");
    assert.equal(await page.locator(".q-pill").count(), answers.length);
    await ensureFits(page);
    let index = 0;
    for (const [partIndex, part] of paper.parts.entries()) {
      if (partIndex) await page.locator('[data-part="' + partIndex + '"]').click();
      assert.match(await page.locator(".part-workspace h2").innerText(), new RegExp(part.title.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&")));
      if (audioCheck && part.audio) {
        await page.locator("#playAudio").click();
        await page.waitForFunction(() => { const audio = document.querySelector("audio"); return audio && audio.currentTime > 0; }, null, { timeout: 20000 });
        await page.locator("audio").evaluate(audio => audio.pause());
        if (shot && partIndex === paper.parts.findIndex(item => item.audio)) {
          await page.screenshot({ path: path.join(artifacts, engine + "-" + id + "-listening.png") });
        }
      }
      for (const question of part.questions) {
        const panel = page.locator('[data-panel="' + index + '"]');
        if (part.id === "r1") {
          const notice = panel.locator(".notice-image");
          assert.equal(await notice.getAttribute("alt"), question.context);
          await notice.evaluate(image => image.decode());
          assert.ok(await notice.isVisible());
        }
        const expected = answers[index];
        assert.equal(question.id, expected.id);
        const choices = question.options || part.options;
        const intentionallyWrong = submissionError && index === 1;
        const answer = intentionallyWrong ? choices.find(choice => !expected.answers.includes(choice)) : expected.answers[0];
        if (await panel.evaluate(element => element.matches(".exam-inline-gap"))) {
          assert.equal(await panel.getAttribute("aria-label"), question.prompt);
          if (choices) {
            assert.deepEqual(await panel.locator("option").evaluateAll(options => options.slice(1).map(option => option.value)), choices);
            await panel.selectOption(answer);
          } else await panel.fill(answer);
          assert.equal(await panel.inputValue(), answer);
        } else if (choices) {
          assert.equal(await panel.locator("legend").textContent(), (index + 1) + ". " + question.prompt);
          assert.deepEqual(await panel.locator("input").evaluateAll(inputs => inputs.map(input => input.value)), choices);
          const choice = choices.indexOf(answer);
          assert.ok(choice >= 0, "expected option must be rendered");
          const label = panel.locator("label").nth(choice);
          if (sizes.hasTouch) await label.tap();
          else await label.click();
          assert.ok(await panel.locator("input").nth(choice).isChecked());
        } else {
          assert.equal(await panel.locator("legend").textContent(), (index + 1) + ". " + question.prompt);
          await panel.locator("input").fill(answer);
        }
        assert.ok(await page.locator('[data-question="' + index + '"].answered').count());
        if (index === 0) {
          await page.locator("#flagBtn").click();
          assert.equal(await page.locator("#flagBtn").getAttribute("aria-pressed"), "true");
          await page.locator("#notesBtn").click();
          await page.getByRole("textbox", { name: "Your notes" }).fill("QA note");
          await page.locator("#dialogAction").click();
          await page.waitForFunction(start => document.getElementById("timer").textContent !== start, paper.minutes + ":00");
          await page.reload();
          await page.locator("#continueSavedBtn").click();
          await page.locator("#notesBtn").click();
          assert.equal(await page.getByRole("textbox", { name: "Your notes" }).inputValue(), "QA note");
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("#flagBtn").getAttribute("aria-pressed"), "true");
          assert.equal(await panel.locator("input:checked").inputValue(), answer);
          await page.locator("#menuBtn").click();
          await page.locator("#overviewBtn").click();
          assert.match(await page.locator("#dialogBody").innerText(), new RegExp((answers.length - 1) + " unanswered"));
          await page.locator(".overview-list button").first().click();
          if (shot) await page.screenshot({ path: path.join(artifacts, engine + "-" + id + "-reading.png") });
        }
        index++;
      }
      await ensureFits(page);
    }
    await page.locator("#nextBtn").click();
    await page.locator("#dialogAction").click();
    if (submissionError) {
      await page.getByRole("button", { name: "Retry submission" }).waitFor();
      await page.reload();
      await page.locator("#continueSavedBtn").click();
      await page.locator("#sendAttempt").click();
    }
    await page.locator(".scoreline").waitFor();
    const correct = answers.length - Number(submissionError);
    assert.equal(await page.locator(".scoreline").innerText(), correct + " / " + answers.length);
    assert.equal(await page.locator(".review-list details").count(), answers.length + paper.parts.filter(part => part.transcript).length);
    assert.equal(calls.length, submissionError ? 2 : 1);
    if (submissionError) assert.deepEqual(calls[0], calls[1], "retry must resend the same immutable attempt");
    assert.equal(calls[0].keyVersion, version);
    assert.equal(Object.keys(calls[0].answers).length, answers.length);
    assert.deepEqual(blocked, []);
    assert.deepEqual(errors, []);
    if (shot) await page.screenshot({ path: path.join(artifacts, engine + "-" + id + "-result.png") });
    await page.reload();
    await page.locator("#continueSavedBtn").click();
    assert.equal(await page.locator(".scoreline").innerText(), correct + " / " + answers.length);
    if (engine === "chromium" && id === ids[0]) {
      const download = page.waitForEvent("download");
      await page.locator("#downloadDetailsPngBtn").click();
      assert.match((await download).suggestedFilename(), /\.png$/);
      await (await download).saveAs(path.join(artifacts, "student-results.png"));
      await page.locator("#clearAttempt").click();
      await page.locator("#startBtn").waitFor();
      assert.equal(await page.locator("#continueSavedBtn").isVisible(), false);
    }
    console.log(engine + " " + id + ": " + correct + "/" + answers.length + ", no live submission");
    return result;
  } finally {
    await context.close();
  }
}

async function teacherAndMaterials(browser, base, receipt) {
  const context = await contextFor(browser, { viewport: { width: 1280, height: 900 } });
  await context.route("**/*", route => {
    return ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  await page.goto(base);
  assert.equal(await page.locator(".variation-row").count(), 3);
  await ensureFits(page);
  await page.screenshot({ path: path.join(artifacts, "catalog-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 660 });
  await ensureFits(page);
  await page.screenshot({ path: path.join(artifacts, "catalog-phone.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto(base + "results.html");
  const csvField = value => '"' + String(value).replaceAll('"', '""') + '"';
  const csv = "Student,Practice exam,Answer key,Group,Score,Max score,Submitted,Question review\r\n" +
    ["QA Fictional, Student", receipt.examId, version, "science", receipt.score, receipt.maxScore, receipt.submittedAt, JSON.stringify(receipt)].map(csvField).join(",");
  await page.locator("#resultsFile").setInputFiles({ name: "wix-fixture.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.locator("#resultsBody tr").waitFor();
  assert.match(await page.locator("#resultsBody").innerText(), /QA Fictional, Student/);
  await page.locator("#examSelect").selectOption(receipt.examId);
  assert.equal(await page.locator("#resultsBody tr").count(), 1);
  await page.locator("#studentInput").fill("another student");
  assert.equal(await page.locator("#resultsBody tr").count(), 0);
  await page.locator("#studentInput").fill("Fictional");
  assert.equal(await page.locator("#resultsBody tr").count(), 1);
  await page.locator("#classIdInput").selectOption("technical");
  assert.equal(await page.locator("#resultsBody tr").count(), 0);
  await page.locator("#classIdInput").selectOption("science");
  await page.getByRole("button", { name: "View answers", exact: true }).click();
  await page.locator("#teacherDetails").waitFor();
  assert.equal(await page.locator("#detailsContent details").count(), receipt.items.length);
  await page.locator("#detailsContent summary").first().click();
  assert.match(await page.locator("#detailsContent details[open]").innerText(), /Student answer:.*Accepted answers:/s);
  const download = page.waitForEvent("download");
  await page.locator("#downloadDetailsPngBtn").click();
  const image = await download;
  assert.match(image.suggestedFilename(), /\.png$/);
  await image.saveAs(path.join(artifacts, "teacher-results.png"));
  await page.screenshot({ path: path.join(artifacts, "teacher-review.png"), fullPage: true });

  for (const level of ["a1", "a2", "b1"]) {
    await page.goto(base + "materials.html?level=" + level + "&view=drills");
    await page.locator("#material[data-ready]").waitFor();
    const topic = json("content/study/" + level + ".json");
    for (const [index, part] of topic.drills.entries()) {
      const form = page.locator("#material form").nth(index);
      const gapNumbers = [...String(part.cloze?.text ?? "").matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]));
      assert.deepEqual(await form.locator(".drill-cloze input").evaluateAll(inputs => inputs.map(input => Number(input.placeholder))), gapNumbers);
      for (const [i, q] of part.questions.entries()) {
        const number = i + 1;
        if (gapNumbers.includes(number)) {
          const input = form.getByRole("textbox", { name: "Gap " + number, exact: true });
          await input.fill(" " + (q.accepted?.[0] || q.answer).toUpperCase() + " ");
          continue;
        }
        const options = q.options || part.options;
        const inputs = form.locator(`input[name="${i}"]`);
        if (options) await inputs.nth(options.indexOf(q.answer)).check();
        else await inputs.fill(q.answer);
      }
      const check = form.getByRole("button", { name: "Check answers" });
      const firstGap = form.locator(".drill-gap").first();
      if (gapNumbers.length) {
        const expected = part.questions[gapNumbers[0] - 1].answer;
        await firstGap.clear();
        await check.click();
        assert.equal(await form.getByRole("status").innerText(), (part.questions.length - 1) + " / " + part.questions.length);
        assert.equal(await firstGap.getAttribute("aria-invalid"), "true");
        assert.ok((await form.locator(".drill-gap-feedback li").first().innerText()).startsWith("Blank. Answer: " + expected));
        await firstGap.fill(expected);
      }
      await check.click();
      assert.equal(await form.getByRole("status").innerText(), part.questions.length + " / " + part.questions.length);
      if (gapNumbers.length) assert.equal(await firstGap.getAttribute("aria-invalid"), "false");
    }
    for (const view of ["study", "speaking"]) {
      await page.goto(base + "materials.html?level=" + level + "&view=" + view);
      await page.locator("#material[data-ready]").waitFor();
      if (view === "speaking") assert.equal(await page.locator(".speaking-card").count(), 2);
      if (process.argv.includes("--pdf")) {
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(image => image.decode()));
        });
        const output = path.join(__dirname, "downloads");
        fs.mkdirSync(output, { recursive: true });
        await page.pdf({ path: path.join(output, level + "-" + view + ".pdf"), printBackground: true, preferCSSPageSize: true });
      }
    }
    console.log(level.toUpperCase() + " drills, study, speaking checked");
  }
  await context.close();
}

async function checkExpiry(browser, base) {
  const context = await browser.newContext();
  await context.route("**/*", route => {
    return ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort();
  });
  try {
    const page = await context.newPage();
    await page.goto(base + "practice.html?exam=" + ids[0]);
    await page.locator("#studentName").fill("QA Fictional Student");
    await page.locator("#startBtn").click();
    await page.goto(base);
    // Pagehide flushes the player's current in-memory state. Set the fixture
    // after leaving the player so its next load receives the expired attempt.
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith("ueplv-practice:"));
      const state = JSON.parse(localStorage.getItem(key));
      state.endsAt = Date.now() - 1000;
      localStorage.setItem(key, JSON.stringify(state));
    });
    await page.goto(base + "practice.html?exam=" + ids[0]);
    await page.locator("#continueSavedBtn").click();
    await page.getByText("Time is up. Your answers are ready to submit.").waitFor();
    assert.equal(await page.locator("#bottomNav").isVisible(), false);
    assert.equal(await page.locator("#sendAttempt").isVisible(), true);
    console.log("Timer expiry locks answers and preserves the submit action");
  } finally {
    await context.close();
  }
}

async function run() {
  assert.ok(version, "missing active key version");
  fs.mkdirSync(artifacts, { recursive: true });
  const server = http.createServer(serve);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port + "/English/";
  const browsers = [];
  try {
    const chrome = await chromium.launch(process.env.EXAM_CHROMIUM_PATH ?
      { executablePath: process.env.EXAM_CHROMIUM_PATH } : { channel: "msedge" });
    browsers.push(chrome);
    if (!process.argv.includes("--pdf-only")) {
      const profiles = [
        { viewport: { width: 1440, height: 900 } }, { viewport: { width: 768, height: 1024 } },
        { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true },
        { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
        { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
        { viewport: { width: 1280, height: 800 } }
      ];
      const receipts = await Promise.all(ids.map((id, i) => runPaper(chrome, base, id, profiles[i], "chromium", { submissionError: i === 0, shot: i === 0 || i === 2, audioCheck: true })));
      const safari = await webkit.launch();
      browsers.push(safari);
      await Promise.all([
        runPaper(safari, base, ids[1], devices["iPhone 13"], "webkit", { shot: true, audioCheck: true }),
        runPaper(safari, base, ids[2], devices["iPad (gen 7)"], "webkit", { audioCheck: true }),
        runPaper(safari, base, ids[4], { viewport: { width: 1440, height: 900 } }, "webkit", { audioCheck: true })
      ]);
      await checkExpiry(chrome, base);
      await teacherAndMaterials(chrome, base, receipts[0]);
    } else {
      const key = json("answer-keys/versions/" + version + "/" + ids[0] + ".json");
      await teacherAndMaterials(chrome, base, mockReceipt({ examId: ids[0], keyVersion: version, answers: {} }, key));
    }
  } finally {
    await Promise.allSettled(browsers.map(browser => browser.close()));
    server.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });

/*
 * Integration Test — Variza Payment Flow
 * اجرا:  node tests/variza-integration-test.js
 * ─────────────────────────────────────────────────────
 * یک سرور واقعی (server.js) با Credentialهای آزمایشی روی پورت موقت بالا می‌آید و
 * سناریوهای امنیتی Webhook و Endpointها به‌صورت HTTP واقعی تست می‌شوند.
 * رزروِ تست مستقیماً در دیتابیس ساخته می‌شود و بعد از تست پاک می‌شود.
 *
 * توجه: ساخت لینک واقعی فقط با VARIZA_API_KEY واقعی ممکن است؛ این تست با کلید
 * جعلی، مسیر خطای API واقعی واریزا (401→502) را هم پوشش می‌دهد و برای سناریوی
 * Fulfillment، رکورد Payment را مستقیم در دیتابیس شبیه‌سازی «لینکِ قبلاً ساخته‌شده» می‌کند.
 */

const { spawn } = require("child_process");
const crypto = require("crypto");
const path = require("path");
const mysql = require("mysql2/promise");

const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = "itest_webhook_secret_" + crypto.randomBytes(8).toString("hex");
const MARKER = `variza-itest-${Date.now()}@example.com`;

let passed = 0;
let failed = 0;
const results = [];
let serverLogGlobal = "";

function assert(name, cond, detail = "") {
  if (cond) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function sign(body, secret = SECRET) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

async function post(pathName, { body, headers = {}, raw } = {}) {
  const payload = raw !== undefined ? raw : JSON.stringify(body ?? {});
  const res = await fetch(BASE + pathName, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: payload,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  return { status: res.status, json };
}

async function get(pathName) {
  const res = await fetch(BASE + pathName);
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  return { status: res.status, json };
}

function webhookHeaders(rawBody, { deliveryId, secret, sig } = {}) {
  const h = {};
  if (sig !== undefined) h["X-Webhook-Signature"] = sig;
  else h["X-Webhook-Signature"] = sign(rawBody, secret);
  if (deliveryId) h["X-Delivery-Id"] = deliveryId;
  return h;
}

async function waitForServer(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log("\n🚀 Starting server for integration tests...");
  const server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: {
      ...process.env,
      PORT: String(PORT),
      SMS_SIMULATE: "1",
      VARIZA_API_KEY: "itest_invalid_key_to_trigger_401",
      VARIZA_WEBHOOK_SECRET: SECRET,
      FRONTEND_URL: "https://itest.example.com",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (d) => {
    serverLog += d.toString();
    serverLogGlobal = serverLog;
  });
  server.stderr.on("data", (d) => {
    serverLog += d.toString();
    serverLogGlobal = serverLog;
  });
  server.on("exit", (code) => {
    serverLog += `\n[server exited with code ${code}]`;
    serverLogGlobal = serverLog;
  });

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "baghsarhang_db",
  });

  // پاکسازی ران‌های قبلی
  await conn.execute(
    `DELETE vp FROM variza_payments vp JOIN reservations r ON r.id = vp.reservation_id WHERE r.guest_email LIKE 'variza-itest-%'`,
  );
  await conn.execute(`DELETE FROM reservations WHERE guest_email LIKE 'variza-itest-%'`);

  try {
    const up = await waitForServer();
    assert("Server started", up);
    if (!up) throw new Error("server did not start");

    // ── ساخت دو رزرو تستی ──
    const [roomRows] = await conn.execute(`SELECT id FROM rooms ORDER BY id LIMIT 1`);
    const roomId = roomRows[0] ? roomRows[0].id : null;
    if (!roomId) throw new Error("هیچ اتاقی در دیتابیس نیست؛ seed اجرا نشده است");

    const [r1] = await conn.execute(
      `INSERT INTO reservations (reservation_number, room_id, room_name, check_in, check_out, number_of_nights,
        guest_name, guest_email, guest_phone, price_per_night, total_price, status, payment_status)
       VALUES (?, ?, 'ITest Room', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2,
        'تست پرداخت', ?, '09999999999', 250000, 500000, 'PENDING', 'PENDING')`,
      [`IT-${Date.now()}-1`, roomId, MARKER],
    );
    const rid1 = r1.insertId;
    const [r2] = await conn.execute(
      `INSERT INTO reservations (reservation_number, room_id, room_name, check_in, check_out, number_of_nights,
        guest_name, guest_email, guest_phone, price_per_night, total_price, status, payment_status)
       VALUES (?, ?, 'ITest Room', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2,
        'تست پرداخت', ?, '09999999999', 100000, 200000, 'PENDING', 'PENDING')`,
      [`IT-${Date.now()}-2`, roomId, MARKER],
    );
    const rid2 = r2.insertId;

    /* ═══ ۱) ساخت لینک با کلید جعلی → خطای API واقعی واریزا ═══ */
    const created = await post("/api/payments/variza/create", { body: { reservationId: rid1 } });
    assert(
      "create با کلید نامعتبر → شکست امن (502/503/504)",
      !created.json.success && [502, 503, 504].includes(created.status),
      `status=${created.status} body=${JSON.stringify(created.json)}`,
    );
    assert("create پاسخ شامل payUrl نیست (بدون Fake Success)", !created.json.payUrl);
    const [afterFail] = await conn.execute(`SELECT payment_status FROM reservations WHERE id=?`, [rid1]);
    assert("Order بعد از شکست ساخت لینک سالم ماند", afterFail[0].payment_status === "PENDING");

    const badReq = await post("/api/payments/variza/create", { body: {} });
    assert("create بدون reservationId → 400", badReq.status === 400);

    /* ═══ ۲) Webhook برای slug ناشناس ═══ */
    const bodyUnknown = JSON.stringify({
      event: "payment.paid", slug: "nosuchslug", attempt_code: "111", amount: 500128,
      status: "paid", sent_at: new Date().toISOString(),
    });
    const wUnk = await post("/api/payments/variza/webhook", {
      raw: bodyUnknown,
      headers: webhookHeaders(bodyUnknown, { deliveryId: "dlv-unknown" }),
    });
    assert("Webhook با slug ناشناس + امضای معتبر → ACK بدون تغییر سفارش", wUnk.status === 200);

    /* ═══ ۳) امضای نامعتبر ═══ */
    const [payRow] = await conn.execute(
      `INSERT INTO variza_payments (reservation_id, provider, provider_slug, amount, status, payment_url, expires_at, created_at, updated_at)
       VALUES (?, 'variza', 'itestslug001', 500000, 'pending', 'https://variza.ir/pay/itestslug001',
         DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW(), NOW())`,
      [rid1],
    );
    const pid1 = payRow.insertId;

    const goodBody = JSON.stringify({
      event: "payment.paid", slug: "itestslug001", attempt_code: "152688947983", amount: 500128,
      status: "paid", sent_at: new Date().toISOString(),
    });

    const wBadSig = await post("/api/payments/variza/webhook", {
      raw: goodBody,
      headers: { "X-Webhook-Signature": sign(goodBody, "wrong_secret"), "X-Delivery-Id": "dlv-badsig" },
    });
    assert("امضای غلط → 400", wBadSig.status === 400);
    const noSig = await post("/api/payments/variza/webhook", {
      raw: goodBody,
      headers: { "X-Delivery-Id": "dlv-nosig" },
    });
    assert("بدون هدر امضا → 400", noSig.status === 400);
    const tampered = await post("/api/payments/variza/webhook", {
      raw: goodBody.replace('"amount":500128', '"amount":999999'),
      headers: webhookHeaders(goodBody, { deliveryId: "dlv-tampered" }),
    });
    assert("Body دستکاری‌شده با امضای body اصلی → 400 (Raw-Body HMAC)", tampered.status === 400);

    const [resAfter] = await conn.execute(`SELECT payment_status, status FROM reservations WHERE id=?`, [rid1]);
    assert(
      "سفارش بعد از وب‌هوک‌های مخرب تغییر نکرد",
      resAfter[0].payment_status === "PENDING" && resAfter[0].status === "PENDING",
    );

    /* ═══ ۴) بدنه غیرJSON با امضای معتبر ═══ */
    const notJson = "this is not json";
    const wNotJson = await post("/api/payments/variza/webhook", {
      raw: notJson,
      headers: webhookHeaders(notJson, { deliveryId: "dlv-notjson" }),
    });
    assert("بدنه خراب با امضای معتبر → 400", wNotJson.status === 400);

    /* ═══ ۵) event نامعتبر ═══ */
    const evBody = JSON.stringify({
      event: "payment.refunded", slug: "itestslug001", amount: 500000, status: "refunded",
      sent_at: new Date().toISOString(),
    });
    const wEv = await post("/api/payments/variza/webhook", {
      raw: evBody,
      headers: webhookHeaders(evBody, { deliveryId: "dlv-ev" }),
    });
    assert("event نامعتبر → ACK و بدون پردازش", wEv.status === 200);

    /* ═══ ۶) Webhook معتبر موفق ═══ */
    const wOk = await post("/api/payments/variza/webhook", {
      raw: goodBody,
      headers: webhookHeaders(goodBody, { deliveryId: "dlv-ok-1" }),
    });
    assert("وب‌هوک معتبر → 200 fulfilled", wOk.status === 200);

    const [[paidPay], [paidRes]] = await Promise.all([
      conn.execute(`SELECT status, attempt_code, delivery_id, paid_at FROM variza_payments WHERE id=?`, [pid1]),
      conn.execute(`SELECT payment_status, status, ref_id, paid_at FROM reservations WHERE id=?`, [rid1]),
    ]);
    assert("Payment → paid", paidPay[0].status === "paid", `got ${paidPay[0].status}`);
    assert("attempt_code ذخیره شد", paidPay[0].attempt_code === "152688947983");
    assert("delivery_id ذخیره شد", paidPay[0].delivery_id === "dlv-ok-1");
    assert("Reservation → payment_status SUCCESS", paidRes[0].payment_status === "SUCCESS");
    assert("Reservation → status CONFIRMED", paidRes[0].status === "CONFIRMED");

    /* ═══ ۷) تکراری: همان Delivery ID ═══ */
    const beforePaidAt = paidPay[0].paid_at;
    await new Promise((r) => setTimeout(r, 1100));
    const wDup = await post("/api/payments/variza/webhook", {
      raw: goodBody,
      headers: webhookHeaders(goodBody, { deliveryId: "dlv-ok-1" }),
    });
    assert("وب‌هوک تکراری (همان Delivery) → 200 duplicate", wDup.status === 200);
    const [dupPay] = await conn.execute(`SELECT paid_at FROM variza_payments WHERE id=?`, [pid1]);
    assert(
      "Fulfillment دوباره انجام نشد (paid_at تغییر نکرد)",
      String(dupPay[0].paid_at) === String(beforePaidAt),
    );

    /* ═══ ۸) Delivery جدید روی Payment قبلاً Paid ═══ */
    const wAgain = await post("/api/payments/variza/webhook", {
      raw: goodBody,
      headers: webhookHeaders(goodBody, { deliveryId: "dlv-ok-2" }),
    });
    assert("Delivery جدید روی سفارش Paid → 200 بدون عملیات مجدد", wAgain.status === 200);
    const [cntDeliv] = await conn.execute(`SELECT COUNT(*) c FROM payment_webhook_deliveries WHERE provider='variza'`);
    // فقط deliveryهایی که به پردازش رسیدند ثبت می‌شوند (unknown + ok-1)
    assert("Deliveryهای پردازش‌شده ثبت شدند", cntDeliv[0].c === 2, `count=${cntDeliv[0].c}`);

    /* ═══ ۹) اختلاف مبلغ (کمتر از مبلغ پایه) ═══ */
    const [p2] = await conn.execute(
      `INSERT INTO variza_payments (reservation_id, provider, provider_slug, amount, status, payment_url, expires_at, created_at, updated_at)
       VALUES (?, 'variza', 'itestslug002', 200000, 'pending', 'https://variza.ir/pay/itestslug002',
         DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW(), NOW())`,
      [rid2],
    );
    const underBody = JSON.stringify({
      event: "payment.paid", slug: "itestslug002", attempt_code: "777", amount: 150000,
      status: "paid", sent_at: new Date().toISOString(),
    });
    const wUnder = await post("/api/payments/variza/webhook", {
      raw: underBody,
      headers: webhookHeaders(underBody, { deliveryId: "dlv-under" }),
    });
    assert("کمتر از مبلغ پایه → 409", wUnder.status === 409);
    const [[failPay], [failRes]] = await Promise.all([
      conn.execute(`SELECT status FROM variza_payments WHERE id=?`, [p2.insertId]),
      conn.execute(`SELECT payment_status FROM reservations WHERE id=?`, [rid2]),
    ]);
    assert("پرداخت کم‌مبلغ → failed", failPay[0].status === "failed");
    assert("سفارش کم‌مبلغ Paid نشد", failRes[0].payment_status === "PENDING");

    /* ═══ ۱۰) مبلغ کمی بیشتر از پایه (اختلاف شناسایی طبق قرارداد واریزا) ═══ */
    await conn.execute(
      `INSERT INTO variza_payments (reservation_id, provider, provider_slug, amount, status, payment_url, expires_at, created_at, updated_at)
       VALUES (?, 'variza', 'itestslug003', 200000, 'pending', 'https://variza.ir/pay/itestslug003',
         DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW(), NOW())`,
      [rid2],
    );
    const deltaBody = JSON.stringify({
      event: "payment.paid", slug: "itestslug003", attempt_code: "888", amount: 200128,
      status: "paid", sent_at: new Date().toISOString(),
    });
    const wDelta = await post("/api/payments/variza/webhook", {
      raw: deltaBody,
      headers: webhookHeaders(deltaBody, { deliveryId: "dlv-delta" }),
    });
    assert("مبلغ ۲۰۰۱۲۸ برای لینک ۲۰۰۰۰۰ (اختلاف شناسایی) → تأیید", wDelta.status === 200);
    const [deltaResRows] = await conn.execute(`SELECT payment_status FROM reservations WHERE id=?`, [rid2]);
    assert("سفارش دوم Paid شد", deltaResRows[0].payment_status === "SUCCESS");

    /* ═══ ۱۱) Status endpoint ═══ */
    const st1 = await get(`/api/payments/variza/status?reservationId=${rid1}`);
    assert("status رزرو اول → orderPaid=true", st1.json.orderPaid === true && st1.json.paymentStatus === "paid");
    const stBad = await get(`/api/payments/variza/status?reservationId=abc`);
    assert("status ورودی نامعتبر → 400", stBad.status === 400);

    /* ═══ ۱۲) manual-confirm باید قفل باشد وقتی درگاه تنظیم است ═══ */
    const mc = await post("/api/payments/manual-confirm", { body: { reservationId: rid1 } });
    assert("manual-confirm با درگاه فعال → 403", mc.status === 403);

    /* ═══ ۱۳) Secret در هیچ پاسخی نیست ═══ */
    const allBodies = JSON.stringify([created, wOk, wDup, wUnder, mc]);
    assert("Secret در پاسخ‌ها لو نرفت", !allBodies.includes(SECRET));

    /* ═══ ۱۴) جمع‌بندی Deliveryها (unknown، ok-1، under، delta) ═══ */
    const [finalDeliv] = await conn.execute(
      `SELECT COUNT(*) c FROM payment_webhook_deliveries WHERE delivery_id IN ('dlv-unknown','dlv-ok-1','dlv-under','dlv-delta')`,
    );
    assert("Deliveryهای نهایی دقیقاً ثبت شدند", finalDeliv[0].c === 4, `count=${finalDeliv[0].c}`);
  } finally {
    // پاکسازی
    await conn
      .execute(
        `DELETE vp FROM variza_payments vp JOIN reservations r ON r.id = vp.reservation_id WHERE r.guest_email LIKE 'variza-itest-%'`,
      )
      .catch(() => {});
    await conn.execute(`DELETE FROM payment_webhook_deliveries`).catch(() => {});
    await conn
      .execute(
        `DELETE FROM notifications WHERE ref_type='reservation' AND ref_id IN (SELECT id FROM (SELECT id FROM reservations WHERE guest_email LIKE 'variza-itest-%') x)`,
      )
      .catch(() => {});
    await conn.execute(`DELETE FROM sms_logs WHERE phone='09999999999'`).catch(() => {});
    await conn.execute(`DELETE FROM reservations WHERE guest_email LIKE 'variza-itest-%'`).catch(() => {});
    await conn.end();
    server.kill();
  }

  console.log(results.join("\n"));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (serverLog && failed > 0) {
    console.log("\n--- Server log tail ---\n" + serverLog.split("\n").slice(-40).join("\n"));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("❌ Test runner crashed:", err.message);
  console.error(err.stack);
  console.error("\n--- Server log ---\n" + serverLogGlobal || "(empty)");
  process.exit(1);
});

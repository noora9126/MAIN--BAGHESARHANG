const { query } = require("../config/db");

const SOURCES = [
  {
    key: "iranhotelonline",
    name: "ایران هتل آنلاین",
    url: "https://www.iranhotelonline.com/babol-hotels/%D9%87%D8%AA%D9%84-%D8%A8%D8%A7%D8%BA-%D8%B3%D8%B1%D9%87%D9%86%DA%AF/",
  },
  {
    key: "eghamat24",
    name: "اقامت ۲۴",
    url: "https://www.eghamat24.com/BabolHotels/BaghsarhangHotel.html",
  },
];

// ─────────────── خالص‌سازی متن ───────────────
function clean(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────── استخراج نظرات از ایران هتل آنلاین ───────────────
// ساختار واقعی: تگ‌ها دارای ویژگی _ngcontent قبل از class هستند؛
// امتیاز در span.text-blue-500، برچسب در span.text-black-500، نویسنده در
// p.text-muted، عنوان در h4.font-bold و متن نظر در p.text-black-300 و
// تاریخ اقامت در p.text-black-200 (فرمت ۱۴۰۴/۸/۱۸)
function parseIranHotelOnline(html) {
  const reviews = [];
  const blocks = html.split('class="w-full p-3 border-bottom ng-star-inserted">').slice(1);

  const aggRating = clean(html.match(/text-blue-500 font-bold text-xl">([^<]+)</)?.[1]);
  const aggCount = clean(html.match(/>([\u06F0-\u06F90-9]+) نظر</)?.[1]);

  for (const block of blocks) {
    const rating = clean(block.match(/text-blue-500[^>]*>([^<]+)</)?.[1]);
    if (!rating) continue;

    const author = clean(block.match(/class="text-sm text-muted">([^<]+)</)?.[1]);
    const titleMatch = block.match(/class="text-sm font-bold">(.*?)<\/h4>/s);
    const contentMatch = block.match(/class="text-sm text-black-300[^"]*">(.*?)<\/p>/s);
    const stayDate = clean(block.match(/class="text-sm text-black-200[^"]*">([^<]+)</)?.[1]);

    const title = clean(titleMatch?.[1]);
    const content = clean(contentMatch?.[1]);

    // اگر نظر فقط تیتر دارد، خود تیتر را به عنوان متن در نظر بگیر
    const finalContent = content || title;
    if (!finalContent && !author) continue;

    // شناسه پایدار برای جلوگیری از ثبت تکراری
    const seed = `${author}|${stayDate}|${title}`;
    const externalId = `ih-${require("crypto").createHash("md5").update(seed).digest("hex").slice(0, 16)}`;

    reviews.push({
      author: author.slice(0, 100),
      rating: parseFloat(rating.replace(",", ".")) || null,
      ratingLabel: clean(block.match(/text-black-500[^>]*>([^<]+)</)?.[1]).slice(0, 50),
      title: title.slice(0, 255),
      content: finalContent.slice(0, 2000),
      stayDate: stayDate.slice(0, 100),
      externalId,
    });
  }

  const meta = {
    rating: aggRating ? parseFloat(aggRating.replace(",", ".")) : null,
    reviewCount: aggCount ? parseInt(aggCount, 10) : null,
  };
  return { reviews, meta, sourceName: "iranhotelonline" };
}

// ─────────────── استخراج امتیاز تجمیعی از اقامت ۲۴ ───────────────
function parseEghamat24(html) {
  const aggregate = {
    rating: null,
    reviewCount: null,
  };
  const ld = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const tag of ld) {
    try {
      const data = JSON.parse(tag.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""));
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const agg = item?.aggregateRating;
        if (agg && agg.ratingValue) {
          aggregate.rating = parseFloat(agg.ratingValue) || null;
          aggregate.reviewCount = parseInt(agg.reviewCount, 10) || null;
        }
      }
    } catch {
      // اسکریپت غیر JSON را نادیده بگیر
    }
  }
  return aggregate;
}

// ─────────────── همگام‌سازی نظرات از منابع خارجی ───────────────
const syncReviews = async (showLog = false) => {
  const results = { total: 0, inserted: 0, updated: 0, source: {} };

  for (const source of SOURCES) {
    let html = "";
    try {
      const res = await fetch(source.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        if (showLog) console.log(`[reviews] ${source.name}: HTTP ${res.status}`);
        results.source[source.key] = { ok: false, error: `HTTP ${res.status}` };
        continue;
      }
      html = await res.text();
    } catch (err) {
      if (showLog) console.log(`[reviews] ${source.name}: fetch error: ${err.message}`);
      results.source[source.key] = { ok: false, error: err.message };
      continue;
    }

    let items = [];
    let meta = {};
    if (source.key === "iranhotelonline") {
      const parsed = parseIranHotelOnline(html);
      items = parsed.reviews;
      meta = { rating: parsed.meta.rating, reviewCount: parsed.meta.reviewCount };
    } else if (source.key === "eghamat24") {
      meta = parseEghamat24(html);
    }

    results.source[source.key] = { ok: true, count: items.length, ...meta };
    results.total += items.length;

    for (const item of items) {
      const extId = item.externalId;
      const dup = await query(
        `SELECT id FROM reviews WHERE source = ? AND external_id = ? LIMIT 1`,
        [source.key, extId]
      );
      const fields = [source.key, source.url, item.author, item.rating, item.ratingLabel, item.title, item.content, item.stayDate, null, extId];
      if (dup[0]) {
        const upd = await query(
          `UPDATE reviews SET author = ?, rating = ?, rating_label = ?, title = ?, content = ?, stay_date = ?, status = 'ACTIVE'
           WHERE id = ?`,
          [item.author, item.rating, item.ratingLabel, item.title, item.content, item.stayDate, dup[0].id]
        );
        if (upd.affectedRows > 0) results.updated++;
      } else {
        const ins = await query(
          `INSERT INTO reviews (source, source_url, author, rating, rating_label, title, content, stay_date, room_type, external_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          fields
        );
        if (ins.insertId) results.inserted++;
      }
    }
  }

  return results;
};

module.exports = { syncReviews, SOURCES };
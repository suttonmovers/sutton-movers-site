// Sutton Movers - Instant Quote Serverless Function
// Receives form submission, calculates quote, sends confirmation email + internal notification

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Sutton Movers <quotes@suttonmovers.com>";
const INTERNAL_EMAIL = "contactsuttonmovers@gmail.com";

// ═══════ PRICING MODEL v10 ═══════
const TRUCK_RATES = {1: 110, 2: 150, 3: 180, 4: 220, 5: 260, 6: 300};
const LABOR_RATES = {1: 75, 2: 100, 3: 130, 4: 170, 5: 210, 6: 250};
const PACK_RATES  = {1: 100, 2: 125, 3: 200, 4: 300, 5: 350, 6: 400};

const SPECIALTY_FEES = {
  piano_upright: 350, piano_grand: 600,
  safe_small: 350, safe_large: 600,
  pool_table: 400, treadmill: 150
};

const MATERIAL_PRICES = {
  box_small: 3, box_medium: 5, box_large: 7, box_wardrobe: 25,
  tape: 5, straps: 10, bubble_wrap: 10, blankets: 15, shrink_wrap: 25
};

const SPECIALTY_LABELS = {
  piano_upright: "Piano (Upright)", piano_grand: "Piano (Grand)",
  safe_small: "Safe (Small)", safe_large: "Safe (Large)",
  pool_table: "Pool Table", treadmill: "Item Over 200 lbs"
};

const MATERIAL_LABELS = {
  box_small: "Small Box", box_medium: "Medium Box", box_large: "Large Box",
  box_wardrobe: "Wardrobe Box", tape: "Packing Tape", straps: "Moving Straps",
  bubble_wrap: "Bubble Wrap", blankets: "Moving Blankets", shrink_wrap: "Shrink Wrap"
};

function seasonalMultiplier() {
  const m = new Date().getMonth() + 1;
  const mult = {1:1,2:1,3:1,4:1,5:1.05,6:1.10,7:1.15,8:1.15,9:1.10,10:1.05,11:1,12:1};
  return mult[m] || 1;
}

function mileageFee(miles) {
  if (miles <= 15) return 0;
  return (miles - 15) * 2;
}

function calculateQuote(data) {
  const crew = Math.min(Math.max(parseInt(data.crew) || 2, 1), 6);
  const withTruck = data.truck === "1" || data.truck === "true";
  const service = data.service || "labor";
  let hours = parseInt(data.hours) || 3;
  const miles = parseInt(data.miles) || 0;
  const stairsP = parseInt(data.stairs_pickup) || 0;
  const stairsD = parseInt(data.stairs_dropoff) || 0;

  let baseRate, minHours;
  if (withTruck) {
    baseRate = TRUCK_RATES[crew] || 150;
    minHours = 3;
  } else if (service === "pack") {
    baseRate = PACK_RATES[crew] || 125;
    minHours = 2;
  } else {
    baseRate = LABOR_RATES[crew] || 100;
    minHours = 2;
  }

  hours = Math.max(hours, minHours);
  let total = baseRate * hours;
  total *= seasonalMultiplier();

  if (withTruck && miles > 0) {
    total += mileageFee(miles);
  }

  total += (stairsP + stairsD) * 25;

  // Specialty items
  const specialties = (data.specialties || "").split(",").filter(Boolean);
  for (const item of specialties) {
    total += SPECIALTY_FEES[item.trim()] || 0;
  }

  // Materials
  let materialsTotal = 0;
  const materialsList = [];
  for (const [key, price] of Object.entries(MATERIAL_PRICES)) {
    const qty = parseInt(data["supply_" + key]) || 0;
    if (qty > 0) {
      materialsTotal += qty * price;
      materialsList.push({ name: MATERIAL_LABELS[key], qty, price, subtotal: qty * price });
    }
  }
  total += materialsTotal;

  total = Math.max(total, 120);
  const low = Math.max(Math.round(total * 0.90 / 5) * 5, 120);
  const high = Math.round(total * 1.20 / 5) * 5;

  return {
    low, high, mid: Math.round(total / 5) * 5,
    crew, hours, baseRate, withTruck, service, miles,
    stairsP, stairsD, specialties, materialsList, materialsTotal
  };
}

// ═══════ EMAIL TEMPLATES ═══════

function customerEmail(data, quote) {
  const name = (data.name || "").split(" ")[0] || "there";
  const serviceDesc = quote.withTruck
    ? `${quote.crew} movers with our truck`
    : quote.service === "pack"
      ? `${quote.crew}-person packing crew`
      : `${quote.crew}-person labor crew`;

  let detailLines = [];
  if (quote.stairsP > 0) detailLines.push(`Stairs at pickup: ${quote.stairsP} flight(s)`);
  if (quote.stairsD > 0) detailLines.push(`Stairs at drop-off: ${quote.stairsD} flight(s)`);
  if (quote.specialties.length > 0) {
    detailLines.push("Specialty items: " + quote.specialties.map(s => SPECIALTY_LABELS[s.trim()] || s).join(", "));
  }
  if (quote.materialsList.length > 0) {
    detailLines.push("Supplies: " + quote.materialsList.map(m => `${m.qty}x ${m.name}`).join(", ") + ` ($${quote.materialsTotal})`);
  }

  const detailSection = detailLines.length > 0
    ? detailLines.map(l => `<li style="padding:4px 0;color:#555;">${l}</li>`).join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;">
  <div style="max-width:560px;margin:0 auto;padding:20px;">
    <div style="background:#1C2431;border-radius:10px 10px 0 0;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;letter-spacing:0.5px;">SUTTON MOVERS</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">Moving in Style</p>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
      <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 20px;">Hi ${name},</p>
      <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 24px;">Thanks for requesting a quote! Here's your instant estimate:</p>

      <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-left:4px solid #D97B2B;border-radius:6px;padding:20px 24px;margin:0 0 24px;text-align:center;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#D97B2B;margin:0 0 8px;">Your Estimated Cost</p>
        <p style="font-size:32px;font-weight:700;color:#1a1a1a;margin:0 0 6px;">$${quote.low} - $${quote.high}</p>
        <p style="font-size:13px;color:#777;margin:0;">${serviceDesc}, ${quote.hours} hours${quote.miles > 0 ? `, ~${quote.miles} mi` : ""}</p>
      </div>

      ${detailSection ? `<ul style="list-style:none;padding:0;margin:0 0 24px;font-size:14px;">${detailSection}</ul>` : ""}

      <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 24px;">Ready to lock in your date? Give us a call or text and we'll get you on the schedule.</p>

      <div style="text-align:center;margin:0 0 24px;">
        <a href="tel:6196023000" style="display:inline-block;background:#D97B2B;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:700;letter-spacing:0.5px;">Call (619) 602-3000</a>
      </div>

      <p style="font-size:12px;color:#999;line-height:1.5;margin:0;text-align:center;">This is an estimate. Final price confirmed after a quick call with our team.${quote.withTruck ? " 3-hour minimum with truck." : " 2-hour minimum."} Stairs, long carries, and access conditions may affect final pricing.</p>
    </div>
    <div style="padding:16px 32px;text-align:center;">
      <p style="font-size:12px;color:#999;margin:0;">Sutton Movers | San Marcos, CA | (619) 602-3000</p>
      <p style="font-size:11px;color:#bbb;margin:6px 0 0;"><a href="https://suttonmovers.com" style="color:#bbb;">suttonmovers.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

function internalEmail(data, quote) {
  const lines = [
    `Name: ${data.name || "N/A"}`,
    `Phone: ${data.phone || "N/A"}`,
    `Email: ${data.email || "N/A"}`,
    `Date: ${data.preferred_date || "N/A"}`,
    `Time: ${data.preferred_time || "N/A"}`,
    "",
    `--- QUOTE ---`,
    `Estimate: $${quote.low} - $${quote.high} (mid $${quote.mid})`,
    `Crew: ${quote.crew}`,
    `Hours: ${quote.hours}`,
    `Rate: $${quote.baseRate}/hr`,
    `Truck: ${quote.withTruck ? "Yes (our truck)" : "No"}`,
    `Service: ${quote.service}`,
    `Miles: ${quote.miles || "N/A"}`,
    `Stairs pickup: ${quote.stairsP}`,
    `Stairs dropoff: ${quote.stairsD}`,
    `Specialties: ${quote.specialties.length ? quote.specialties.map(s => SPECIALTY_LABELS[s.trim()] || s).join(", ") : "None"}`,
  ];

  if (quote.materialsList.length > 0) {
    lines.push("");
    lines.push("--- MATERIALS ---");
    for (const m of quote.materialsList) {
      lines.push(`${m.qty}x ${m.name} @ $${m.price} = $${m.subtotal}`);
    }
    lines.push(`Materials total: $${quote.materialsTotal}`);
  }

  lines.push("");
  lines.push("--- ADDRESSES ---");
  lines.push(`Pickup: ${data.pickup_address || "N/A"}`);
  lines.push(`Dropoff: ${data.dropoff_address || "N/A"}`);

  if (data.message) {
    lines.push("");
    lines.push("--- NOTES ---");
    lines.push(data.message);
  }

  return lines.join("\n");
}

// ═══════ HANDLER ═══════

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    // Parse form data (URL-encoded from HTML form)
    const params = new URLSearchParams(event.body);
    const data = {};
    for (const [key, value] of params) {
      data[key] = value;
    }

    // Calculate quote
    const quote = calculateQuote(data);

    // Send customer confirmation email
    const customerHtml = customerEmail(data, quote);
    const customerRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: data.email,
        subject: `Your Moving Quote: $${quote.low} - $${quote.high} | Sutton Movers`,
        html: customerHtml
      })
    });

    if (!customerRes.ok) {
      const err = await customerRes.text();
      console.error("Customer email failed:", err);
    }

    // Send internal notification
    const internalBody = internalEmail(data, quote);
    const internalRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: INTERNAL_EMAIL,
        subject: `New Quote: ${data.name || "Unknown"} | $${quote.low}-$${quote.high} | ${quote.crew} crew ${quote.hours}hr`,
        html: `<pre style="font-family:monospace;font-size:13px;line-height:1.6;">${internalBody}</pre>`
      })
    });

    if (!internalRes.ok) {
      const err = await internalRes.text();
      console.error("Internal email failed:", err);
    }

    // Return success (for AJAX form submission)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, estimate: { low: quote.low, high: quote.high } })
    };

  } catch (err) {
    console.error("Quote function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to process quote" })
    };
  }
};

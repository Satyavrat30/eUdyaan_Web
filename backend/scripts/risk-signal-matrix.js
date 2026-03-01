const { hasSeriousRiskSignal } = require("../utils/riskSignals");

const MATRIX = [
  { text: "I want to die", expected: true },
  { text: "I don't want to live anymore", expected: true },
  { text: "I wish I was dead", expected: true },
  { text: "kill myself", expected: true },
  { text: "take my own life", expected: true },
  { text: "No reason to live", expected: true },
  { text: "mujhe marna hai", expected: true },
  { text: "mujhe mar jana hai", expected: true },
  { text: "jeena nahi hai", expected: true },
  { text: "khud ko marna hai", expected: true },
  { text: "apni jaan lena chahta hoon", expected: true },
  { text: "mujhe fansi lgana hai", expected: true },
  { text: "mujhe phansi lagani hai", expected: true },
  { text: "latakna hai", expected: true },
  { text: "phanda lagana", expected: true },
  { text: "आत्महत्या करनी है", expected: true },
  { text: "खुदकुशी kar lunga", expected: true },
  { text: "फांसी लगा लूंगा", expected: true },
  { text: "फाँसी लगानी है", expected: true },
  { text: "जीना नहीं चाहता", expected: true },
  { text: "exam stress ho raha hai", expected: false },
  { text: "I am sad and anxious", expected: false },
  { text: "I feel lonely today", expected: false },
  { text: "Need help with panic attacks", expected: false },
  { text: "My roommate is killing my vibe", expected: false },
  { text: "This assignment is killing me", expected: false }
];

let passed = 0;
let failed = 0;

for (const [index, row] of MATRIX.entries()) {
  const actual = hasSeriousRiskSignal(row.text);
  const ok = actual === row.expected;
  if (ok) {
    passed += 1;
  } else {
    failed += 1;
  }

  const marker = ok ? "PASS" : "FAIL";
  console.log(`${String(index + 1).padStart(2, "0")}. ${marker} | expected=${row.expected} actual=${actual} | ${row.text}`);
}

console.log(`\nSummary: ${passed} passed, ${failed} failed, total ${MATRIX.length}`);

if (failed > 0) {
  process.exitCode = 1;
}

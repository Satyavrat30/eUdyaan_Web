const SELF_HARM_RISK_PATTERNS = [
  /\b(kms|kys)\b/i,
  /\bsuicide\b/i,
  /\bkill\s*my\s*self\b/i,
  /\btake\s*my\s*life\b/i,
  /\btake\s*my\s*own\s*life\b/i,
  /\bwant\s*to\s*die\b/i,
  /\bdon'?t\s*want\s*to\s*live\b/i,
  /\bdo\s*not\s*want\s*to\s*live\b/i,
  /\bno\s*reason\s*to\s*live\b/i,
  /\bbetter\s*off\s*dead\b/i,
  /\bwish\s*i\s*was\s*dead\b/i,
  /\bcan'?t\s*go\s*on\b/i,
  /\bnot\s*worth\s*living\b/i,
  /\bend\s*my\s*life\b/i,
  /\bend\s*it\s*all\b/i,
  /\bself[- ]?harm\b/i,
  /\bhurt\s*myself\b/i,
  /\bmarna\b/i,
  /\bmar\s*jana\b/i,
  /\bjeena\s*nahi\b/i,
  /\bjeena\s*nahi\s*(hai|chahta|chahti)\b/i,
  /\bmujhe\s*marna\s*hai\b/i,
  /\bmujhe\s*mar\s*jana\s*hai\b/i,
  /\bjaan\s*dena\b/i,
  /\bapni\s*jaan\s*lena\b/i,
  /\bkhud\s*ko\s*mar(na|\s*dena)\b/i,
  /\bsuicidal\b/i,
  /\bfansi\b/i,
  /\bfasi\b/i,
  /\bfaansi\b/i,
  /\bphansi\b/i,
  /\bphaansi\b/i,
  /\bf[ae]?a?n?s[iy]\s*(lagana|lgana|lagaana|lagane|lgane)\b/i,
  /\blatakna\b/i,
  /\bphanda\b/i,
  /\bzeher\b/i,
  /\boverdose\b/i,
  /\bquit\s*life\b/i,
  /\bquit\s*living\b/i,
  /आत्महत्या/i,
  /खुदकुशी/i,
  /फांसी/i,
  /फाँसी/i,
  /फंदा/i,
  /मर\s*जाना/i,
  /मरना\s*है/i,
  /जीना\s*नहीं/i,
  /जान\s*दे\s*(दूंगा|दूँगा|दूंगी|दूँगी|दूंगी|दुंगी|देना)/i,
  /खुद\s*को\s*मार/i,
  /मर\s*डाल/i,
  /मुझे\s*मरना\s*है/i
];

const VIOLENCE_RISK_PATTERNS = [
  /\bplan\s*(a|an)?\s*(bomb|blast|attack)\b/i,
  /\bplant\s*(a|an)?\s*bomb\b/i,
  /\buse\s*(a|an)?\s*bomb\b/i,
  /\bbomb\s*(the|this|a|my)?\s*(campus|college|school|building|class|hostel)\b/i,
  /\b(blast|explode|blow\s*up)\s*(the|this|a|my)?\s*(campus|college|school|building|class|hostel|bus)\b/i,
  /\bshoot\s*(them|him|her|people|everyone|students?|classmates?|teacher|teachers)\b/i,
  /\bstab\s*(them|him|her|someone|people)\b/i,
  /\bkill\s*(them|him|her|everyone|people|students?|classmates?|teacher|teachers)\b/i,
  /\bmurder\b/i,
  /\bmaar\s*do\b/i,
  /\bmar\s*do\b/i,
  /\bcampus\s*ko\s*bomb\s*se\s*udaa?\s*(du|dun|dunga|dungi)\b/i,
  /\bbomb\s*(se)?\s*udaa?\s*(du|dun|dunga|dungi)\b/i,
  /\bbomb\s*rakh\s*(du|dun|dunga|dungi)\b/i,
  /\b(campus|college|school|hostel|class)\s*ko\s*(udaa?|jala)\s*(du|dun|dunga|dungi)\b/i,
  /\b(sabko|logon\s*ko|students?|classmates?|teacher|teachers)\s*maar\s*(du|dun|dunga|dungi)\b/i,
  /बम\s*(से)?\s*(उड़ा|फोड़)/i,
  /कैंपस\s*को\s*बम\s*से\s*उड़ा/i,
  /(सबको|लोगों\s*को|छात्रों\s*को|टीचर\s*को)\s*मार\s*(दूंगा|दूँगा|दूंगी|दूँगी|दू)/i
];

function getPatternMatch(text, patterns) {
  const source = String(text || "");
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return "";
}

function detectRiskSignal(text) {
  if (!text || typeof text !== "string") {
    return { matched: false, category: "none", term: "" };
  }

  const selfHarmTerm = getPatternMatch(text, SELF_HARM_RISK_PATTERNS);
  if (selfHarmTerm) {
    return { matched: true, category: "self_harm", term: selfHarmTerm };
  }

  const violenceTerm = getPatternMatch(text, VIOLENCE_RISK_PATTERNS);
  if (violenceTerm) {
    return { matched: true, category: "violence", term: violenceTerm };
  }

  return { matched: false, category: "none", term: "" };
}

function hasSeriousRiskSignal(text) {
  return detectRiskSignal(text).matched;
}

const RISK_PATTERNS = [...SELF_HARM_RISK_PATTERNS, ...VIOLENCE_RISK_PATTERNS];

module.exports = {
  RISK_PATTERNS,
  SELF_HARM_RISK_PATTERNS,
  VIOLENCE_RISK_PATTERNS,
  detectRiskSignal,
  hasSeriousRiskSignal
};

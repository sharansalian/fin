/**
 * SMS Transaction Parser
 * Supports major Indian banks: HDFC, ICICI, SBI, Axis, Kotak, Yes Bank,
 * IDFC, IndusInd, Federal, BOI, PNB, Canara, and UPI apps
 */

const CATEGORIES = {
  food: ['swiggy', 'zomato', 'uber eats', 'dominos', 'pizza', 'restaurant', 'cafe', 'kfc', 'mcdonalds', 'subway', 'burger', 'food', 'dining', 'hotel', 'biryani', 'dosa'],
  shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'shopping', 'mart', 'store', 'retail', 'fashion', 'clothes', 'shoes'],
  transport: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'bus', 'cab', 'taxi', 'travel', 'flight', 'airline', 'petrol', 'fuel', 'fastag'],
  entertainment: ['netflix', 'hotstar', 'prime', 'spotify', 'youtube', 'zee5', 'sony liv', 'movie', 'cinema', 'pvr', 'inox', 'gaming', 'steam'],
  health: ['pharmacy', 'hospital', 'clinic', 'medical', 'doctor', 'medicine', 'health', 'apollo', 'medplus', '1mg', 'netmeds', 'lab', 'diagnostic'],
  utilities: ['electricity', 'water', 'gas', 'broadband', 'internet', 'wifi', 'jio', 'airtel', 'vodafone', 'vi', 'bsnl', 'bill', 'recharge', 'dth'],
  education: ['school', 'college', 'university', 'course', 'udemy', 'coursera', 'byju', 'unacademy', 'fees', 'tuition', 'books', 'education'],
  investment: ['zerodha', 'groww', 'upstox', 'paytm money', 'mutual fund', 'sip', 'stocks', 'shares', 'nse', 'bse', 'investment', 'mf', 'fd', 'ipo'],
  transfer: ['upi', 'neft', 'imps', 'rtgs', 'transfer', 'sent', 'paid to', 'payment to'],
  income: ['salary', 'credited', 'refund', 'cashback', 'reward', 'bonus', 'stipend', 'income'],
};

const BANK_PATTERNS = [
  // HDFC Bank
  {
    bank: 'HDFC Bank',
    pattern: /(?:HDFC|HDFCBK|HDFCBANK)/i,
    debit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|deducted|spent|paid|sent)/i,
    credit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:credited|received)/i,
    merchant: /(?:at|to|from)\s+([A-Za-z0-9\s&'.,-]+?)(?:\s+on|\s+via|\s+Ref|\s+UPI|\.|$)/i,
    altDebit: /debited\s+(?:with\s+)?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
    altCredit: /credited\s+(?:with\s+)?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
  },
  // ICICI Bank
  {
    bank: 'ICICI Bank',
    pattern: /(?:ICICI|ICICIB)/i,
    debit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|deducted|spent)/i,
    credit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:credited|received)/i,
    merchant: /(?:at|to|from)\s+([A-Za-z0-9\s&'.,-]+?)(?:\s+on|\s+via|\s+Ref|\s+UPI|\.|$)/i,
    altDebit: /debited\s+(?:with\s+)?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
    altCredit: /credited\s+(?:with\s+)?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
  },
  // SBI
  {
    bank: 'SBI',
    pattern: /(?:SBI|SBIINB|SBIPSG|State Bank)/i,
    debit: /(?:debited|withdrawn|transferred).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
    credit: /(?:credited|deposited|received).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
    merchant: /(?:at|to|from)\s+([A-Za-z0-9\s&'.,-]+?)(?:\s+on|\s+via|\s+Ref|\.|$)/i,
    altDebit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*).*?(?:debit|withdrawn)/i,
    altCredit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*).*?(?:credit|deposit)/i,
  },
  // Axis Bank
  {
    bank: 'Axis Bank',
    pattern: /(?:AXISBK|UTIBANKLTD|Axis Bank)/i,
    debit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|deducted)/i,
    credit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:credited|received)/i,
    merchant: /(?:at|to|from)\s+([A-Za-z0-9\s&'.,-]+?)(?:\s+on|\s+via|\s+Ref|\.|$)/i,
    altDebit: /debited.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
    altCredit: /credited.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
  },
  // Kotak Bank
  {
    bank: 'Kotak Bank',
    pattern: /(?:KOTAK|KOTAKB)/i,
    debit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|spent|paid)/i,
    credit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:credited|received)/i,
    merchant: /(?:at|to|from)\s+([A-Za-z0-9\s&'.,-]+?)(?:\s+on|\s+via|\s+Ref|\.|$)/i,
    altDebit: /debited.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
    altCredit: /credited.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
  },
  // Generic UPI / Other banks
  {
    bank: 'Bank',
    pattern: /(?:UPI|NEFT|IMPS|paytm|gpay|phonepe|bhim)/i,
    debit: /(?:debited|deducted|paid|sent).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)|(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*).*?(?:debited|deducted|paid|sent)/i,
    credit: /(?:credited|received).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)|(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*).*?(?:credited|received)/i,
    merchant: /(?:at|to|from|by)\s+([A-Za-z0-9\s&'.,-]+?)(?:\s+on|\s+via|\s+Ref|\s+UPI|\.|$)/i,
    altDebit: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
    altCredit: null,
  },
];

const extractAmount = (text, pattern, altPattern) => {
  const match = text.match(pattern);
  if (match) {
    const amt = (match[1] || match[2] || '').replace(/,/g, '');
    return parseFloat(amt) || null;
  }
  if (altPattern) {
    const altMatch = text.match(altPattern);
    if (altMatch) {
      const amt = (altMatch[1] || altMatch[2] || '').replace(/,/g, '');
      return parseFloat(amt) || null;
    }
  }
  return null;
};

const extractMerchant = (text, pattern) => {
  const match = text.match(pattern);
  if (match && match[1]) {
    return match[1].trim().replace(/\s+/g, ' ').substring(0, 50);
  }
  // Fallback: look for UPI ID or common patterns
  const upiMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z]+)/);
  if (upiMatch) return upiMatch[1];
  return 'Unknown Merchant';
};

const extractBalance = (text) => {
  const balancePattern = /(?:avl|available|bal|balance)[\s.:]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i;
  const match = text.match(balancePattern);
  if (match) {
    return parseFloat(match[1].replace(/,/g, '')) || null;
  }
  return null;
};

const extractDate = (text) => {
  // Try to extract date from SMS
  const datePatterns = [
    /(\d{2}[-/]\d{2}[-/]\d{2,4})/,
    /(\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i,
    /(\d{4}[-/]\d{2}[-/]\d{2})/,
  ];
  for (const pat of datePatterns) {
    const match = text.match(pat);
    if (match) {
      const d = new Date(match[1]);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
};

const categorizeTransaction = (merchant, description) => {
  const combined = `${merchant} ${description}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((k) => combined.includes(k))) {
      return category;
    }
  }
  return 'others';
};

const CATEGORY_ICONS = {
  food: '🍔',
  shopping: '🛍️',
  transport: '🚗',
  entertainment: '🎬',
  health: '💊',
  utilities: '💡',
  education: '📚',
  investment: '📈',
  transfer: '💸',
  income: '💰',
  others: '📌',
};

export const parseSMS = (smsText) => {
  if (!smsText || typeof smsText !== 'string') return null;

  const text = smsText.trim();

  // Check if it looks like a bank transaction SMS
  const hasAmount = /(?:INR|Rs\.?|₹)\s*[\d,]+/i.test(text);
  const hasTransactionKeyword = /(?:debited|credited|deducted|transferred|sent|received|paid|spent|withdrawn|deposited)/i.test(text);

  if (!hasAmount && !hasTransactionKeyword) return null;

  let detectedBank = 'Bank';
  let bankPattern = null;

  for (const bp of BANK_PATTERNS) {
    if (bp.pattern.test(text)) {
      detectedBank = bp.bank;
      bankPattern = bp;
      break;
    }
  }

  // Use generic pattern if no bank detected
  if (!bankPattern) {
    bankPattern = BANK_PATTERNS[BANK_PATTERNS.length - 1];
  }

  // Determine transaction type
  const isDebit = /(?:debited|deducted|paid|sent|spent|withdrawn|transferred out)/i.test(text);
  const isCredit = /(?:credited|received|deposited|refund|cashback)/i.test(text);

  let amount = null;
  let type = 'debit';

  if (isDebit && !isCredit) {
    amount = extractAmount(text, bankPattern.debit, bankPattern.altDebit);
    type = 'debit';
  } else if (isCredit && !isDebit) {
    amount = extractAmount(text, bankPattern.credit, bankPattern.altCredit);
    type = 'credit';
  } else if (isCredit && isDebit) {
    // Both keywords - check which comes first
    const debitIdx = text.toLowerCase().search(/debited|deducted|paid|sent/);
    const creditIdx = text.toLowerCase().search(/credited|received|deposited/);
    if (creditIdx < debitIdx) {
      amount = extractAmount(text, bankPattern.credit, bankPattern.altCredit);
      type = 'credit';
    } else {
      amount = extractAmount(text, bankPattern.debit, bankPattern.altDebit);
      type = 'debit';
    }
  } else {
    // Fallback: just extract any amount
    const genericMatch = text.match(/(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i);
    if (genericMatch) {
      amount = parseFloat(genericMatch[1].replace(/,/g, ''));
    }
  }

  if (!amount || amount <= 0) return null;

  const merchant = extractMerchant(text, bankPattern.merchant);
  const balance = extractBalance(text);
  const date = extractDate(text);
  const category = categorizeTransaction(merchant, text);

  return {
    id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    amount,
    merchant,
    bank: detectedBank,
    category,
    categoryIcon: CATEGORY_ICONS[category],
    balance,
    date,
    rawSMS: text,
    source: 'sms',
  };
};

export const parseMultipleSMS = (smsArray) => {
  return smsArray
    .map((sms) => parseSMS(typeof sms === 'string' ? sms : sms.body || sms.text || ''))
    .filter(Boolean);
};

export const CATEGORY_COLORS = {
  food: '#FF6B6B',
  shopping: '#4ECDC4',
  transport: '#45B7D1',
  entertainment: '#96CEB4',
  health: '#FFEAA7',
  utilities: '#DDA0DD',
  education: '#98D8C8',
  investment: '#F7DC6F',
  transfer: '#85C1E9',
  income: '#82E0AA',
  others: '#AEB6BF',
};

export { CATEGORIES, CATEGORY_ICONS };

export const SAMPLE_SMS = [
  "Your HDFC Bank Account XX1234 has been debited by INR 450.00 on 20-01-2025 at SWIGGY. Available Balance:INR 12,450.50",
  "Dear Customer, INR 1,200.00 has been debited from your ICICI Bank account XX5678 for AMAZON purchase on 21-01-2025. Bal: Rs.8,234.00",
  "SBI: Your account XX9876 credited with INR 55,000.00 on 22-01-2025. Balance: INR 67,450.00. Ref No. 12345678",
  "Rs 299 debited from Kotak Bank account XX4321 for NETFLIX subscription on 23-01-2025. Avl Bal: Rs 5,621.00",
  "Your Axis Bank A/c XX7890 is debited INR 850.00 for UPI/ZOMATO/FOOD ORDER on 24-01-2025. Bal:INR 3,450.00",
  "Rs.2,500.00 transferred via UPI from your HDFC account to john@oksbi on 25-01-2025. Avl Bal: INR 9,950.50",
  "INR 150.00 debited from your account for OLA CABS ride on 26-01-2025. Balance: Rs 15,300.00 - ICICI Bank",
  "Your A/c XX1111 credited with INR 3,500.00 from REFUND-AMAZON on 27-01-2025. Bal:INR 18,800.00 - SBI",
  "HDFC Bank: Rs 1,800.00 spent on your Credit Card XX2222 at PETROL BUNK on 28-01-2025.",
  "Debit of INR 999.00 from account XX3333 for JIOFIBER BROADBAND on 29-01-2025. Bal: Rs 22,001.00 - Kotak",
  "Rs.500 paid to GROCERY STORE via UPI on 30-01-2025. Your available balance is Rs.11,501.00 - HDFC Bank",
  "INR 45,000.00 credited to your SBI account XX6543 as SALARY on 01-02-2025. Bal:INR 47,650.00",
];

const CATS = [
  { name: 'Food & Grocery', kw: ['hotel','cafe','restaurant','food','tiffin','canteen','swiggy','zomato','bhojanalaya','khanavali','gokula','annapoorn','avenue food','udupi','majestic','zepto','instamart','bigbasket','grofer','dmart','supermarket','mart','royalmart','fruits','ismiel','ismael'] },
  { name: 'Travel', kw: ['petrol','fuel','service station','auto care','saptagiri','bhagirathi','hp auto','bp petrol','kodikrupa','metro','bangalore metro','nwkrtc','bus','cab','uber','ola','rapido','auto','flight'] },
  { name: 'Bills & Subscription', kw: ['kreditbee','fibe','slice','loan','emi','credit','apple media','netflix','spotify','hotstar','prime','youtube','aws','fiber'] },
  { name: 'Shopping', kw: ['shop','electronic','attibele','apple','amazon','flipkart','myntra','meesho','shreyas','hardware','keyboard','bag'] },
  { name: 'Miscellaneous', kw: ['medical','pharmacy','medicare','hospital','clinic','health','doctor','photo','studio','highway digital','rashmi','rahul','likhith','hemavathi','apoorva','venkatesh','akshay','prabhu','swarupa','hari naik','vidhath','prakash','jeevan','savitha','yeddula','abhishek','mahesh','ramesh','shivana','ramya','zakir','1113','upi lite','wallet','money added'] }
];

const categorize = (name: string): string => {
  const n = name.toLowerCase();
  for (const c of CATS) {
    if (c.kw.some(k => n.includes(k))) return c.name;
  }
  return 'Miscellaneous';
};

const GPAY_MONTHS: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };

function parseGPayDate(dateStr: string): string {
  const dm = dateStr.match(/(\d{1,2}) (\w{3}), (\d{4})/);
  if (!dm) return new Date().toISOString().split('T')[0];
  const [, day, mon, year] = dm;
  const month = String((GPAY_MONTHS[mon] ?? 0) + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${month}-${d}`;
}

function parsePhonePeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return new Date().toISOString().split('T')[0];
}

export function extractTransactions(text: string): Array<{ name: string; amount: number; type: 'income' | 'expense'; category: string; date: string }> {
  const txns: Array<{ name: string; amount: number; type: 'income' | 'expense'; category: string; date: string }> = [];
  const combined = text.replace(/\s+/g, ' ');

  // PhonePe pattern: "Jun 15, 2026 12:45 PM Paid to ... Debit INR 500.00"
  const pat = /(\w+ \d{1,2}, \d{4}) (\d{1,2}:\d{2} [AP]M) ((?:Paid to|Received from) .+?) (Debit|Credit) INR ([\d,]+\.?\d*)/g;
  let m;
  while ((m = pat.exec(combined)) !== null) {
    const name = m[3].trim()
      .replace(/^(Paid to|Received from)\s+/i, '')
      .replace(/\s*Transaction ID.*$/i, '')
      .replace(/\s*UPI Ref.*$/i, '')
      .trim();
    const amount = parseFloat(m[5].replace(/,/g, ''));
    const type = m[4] === 'Credit' ? 'income' : 'expense';
    if (!name || isNaN(amount)) continue;
    txns.push({
      date: parsePhonePeDate(m[1]),
      name,
      type,
      amount,
      category: type === 'income' ? 'Investment' : categorize(name)
    });
  }

  // Wallet pattern
  const walPat = /(\w+ \d{1,2}, \d{4}) (\d{1,2}:\d{2} [AP]M) (Money added.+?) Debit INR ([\d,]+\.?\d*)/g;
  while ((m = walPat.exec(combined)) !== null) {
    const amount = parseFloat(m[4].replace(/,/g, ''));
    if (isNaN(amount)) continue;
    txns.push({
      date: parsePhonePeDate(m[1]),
      name: 'UPI Lite top-up',
      type: 'expense',
      amount,
      category: 'Miscellaneous'
    });
  }

  // Fallback: Rs. / ₹ variants
  if (txns.length === 0) {
    const pat2 = /(\w+ \d{1,2}, \d{4}) (\d{1,2}:\d{2} [AP]M) ((?:Paid to|Received from) .+?) (Debit|Credit) (?:Rs\.|₹) ?([\d,]+\.?\d*)/g;
    while ((m = pat2.exec(combined)) !== null) {
      const name = m[3].trim().replace(/^(Paid to|Received from)\s+/i, '').trim();
      const amount = parseFloat(m[5].replace(/,/g, ''));
      const type = m[4] === 'Credit' ? 'income' : 'expense';
      if (!name || isNaN(amount)) continue;
      txns.push({
        date: parsePhonePeDate(m[1]),
        name,
        type,
        amount,
        category: type === 'income' ? 'Investment' : categorize(name)
      });
    }
  }

  return txns;
}

export function extractGPayTransactions(text: string): Array<{ name: string; amount: number; type: 'income' | 'expense'; category: string; date: string }> {
  const txns: Array<{ name: string; amount: number; type: 'income' | 'expense'; category: string; date: string }> = [];
  const combined = text.replace(/\s+/g, ' ');

  // DD Mon, YYYY HH:MM AM/PM Paid to/Received from/Self transfer to NAME UPI Transaction ID: NNNN Paid by BANK XXXX ₹AMOUNT
  const pat = /(\d{1,2} \w{3}, \d{4}) (\d{1,2}:\d{2} [AP]M) ((?:Paid to|Received from|Self transfer to) .+?) UPI Transaction ID: \d+ Paid by [^₹]+(₹[\d,]+(?:\.\d+)?)/g;
  let m;
  while ((m = pat.exec(combined)) !== null) {
    const fullDesc = m[3].trim();
    if (/^Self transfer to/i.test(fullDesc)) continue;

    const type = /^Received from/i.test(fullDesc) ? 'income' : 'expense';
    const name = fullDesc.replace(/^(?:Paid to|Received from)\s+/i, '').trim();
    const amount = parseFloat(m[4].replace('₹', '').replace(/,/g, ''));
    if (!name || isNaN(amount)) continue;

    const dateStr = m[1];
    txns.push({
      date: parseGPayDate(dateStr),
      name,
      type,
      amount,
      category: type === 'income' ? 'Investment' : categorize(name)
    });
  }

  return txns;
}

export function detectAndParseStatement(text: string): Array<{ name: string; amount: number; type: 'income' | 'expense'; category: string; date: string }> {
  if (/google pay/i.test(text) || /UPI Transaction ID:/i.test(text)) {
    return extractGPayTransactions(text);
  }
  return extractTransactions(text);
}

export const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      return resolve((window as any).pdfjsLib);
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js library'));
    document.head.appendChild(script);
  });
};

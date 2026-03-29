const XLSX = require("xlsx");

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseStudentsFromExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const sheet = wb.Sheets[sheetName];
  // Get all data as 2D array to find the header row
  const allData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  
  if (allData.length === 0) return [];

  // Find the header row (scan first 10 rows for something that looks like headers)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(allData.length, 10); i++) {
    const row = allData[i].map(h => normalizeHeader(h));
    if (row.includes("name") || row.includes("student name") || row.includes("serial no") || row.includes("sn")) {
      headerIndex = i;
      break;
    }
  }

  // If no clear header found, use positional mapping for the first row as well
  let headers = [];
  let dataRows = [];
  
  if (headerIndex !== -1) {
    headers = allData[headerIndex].map(h => normalizeHeader(h));
    dataRows = allData.slice(headerIndex + 1);
    console.log("[Excel Parse] Found headers:", headers);
  } else {
    console.log("[Excel Parse] No headers found, using positional mapping.");
    dataRows = allData;
    // We don't have headers, so we'll use null for headers and handle by index
  }

  const students = dataRows
    .map((rowArr, idx) => {
      // If we have headers, build a 'row' object. Otherwise use indices.
      const row = {};
      if (headerIndex !== -1) {
        headers.forEach((h, i) => {
          if (h) row[h] = rowArr[i];
        });
      } else {
        // Positional mapping: 0=slNo, 1=name, 2=father, 3=age, 4=phone
        row["slno"] = rowArr[0];
        row["name"] = rowArr[1];
        row["father name"] = rowArr[2];
        row["age"] = rowArr[3];
        row["phone number"] = rowArr[4];
      }

      // Student ID
      const slNo = String(
        row["studentid"] ??
        row["student id"] ??
        row["sl.no"] ??
        row["sl no"] ??
        row["slno"] ??
        row["sl"] ??
        row["serial no"] ??
        row["serialno"] ??
        row["sn"] ??
        ""
      )
        .trim()
        .replace(/^\s*0+/, (m) => (m.length > 1 ? m : ""));

      // Name
      const name = String(row["name"] ?? row["student name"] ?? row["studentname"] ?? "").trim();

      // Father Name
      const fatherName = String(row["father name"] ?? row["fathername"] ?? "").trim();

      // Age
      const rawAge = String(row["age"] ?? "").trim();
      const age = rawAge ? Number(rawAge) : null;

      // Phone
      const phone = String(
        row["phonenumber"] ?? 
        row["phone number"] ?? 
        row["phone"] ?? 
        row["mobile"] ?? 
        row["[phone number"] ?? 
        row["phone_number"] ?? 
        ""
      ).trim();

      if (!name || (!phone && !slNo)) {
         // console.log(`[Excel Parse] Row ${idx} skipped: name=${name}, phone=${phone}`);
         return null;
      }
      
      return { 
        slNo: slNo || `auto_${idx}`, // fallback if slNo is missing
        name, 
        fatherName, 
        age: Number.isFinite(age) ? age : null, 
        phone 
      };
    })
    .filter(Boolean);

  console.log(`[Excel Parse] Successfully parsed ${students.length} students.`);
  return students;
}

function buildAttendanceWorkbook({ date, present, absent, newStudents = [], openingStock = 0 }) {
  const wb = XLSX.utils.book_new();

  const toRow = (s, isPresent) => {
    const qty = isPresent ? (s.quantity || 0) : 0;
    const method = isPresent ? (s.paymentMethod || "Cash") : "N/A";
    const totalAmount = (method === "Free" || !isPresent) ? 0 : qty * 70;

    return {
      "Serial No": s.slNo,
      "Student Name": s.name,
      "Father Name": s.fatherName || "",
      "Age": s.age ?? "",
      "Phone Number": s.phone,
      "Status": isPresent ? "Present" : "Absent",
      "Payment Method": method,
      "Quantity": qty,
      "Total Amount": totalAmount,
      "Review": s.remark || "",
      "Date": date,
    };
  };

  const presentRows = present.map(s => toRow(s, true));
  
  const absentRows = absent.map(s => {
    const r = toRow(s, false);
    delete r["Payment Method"];
    delete r["Quantity"];
    delete r["Total Amount"];
    return r;
  });
  
  const newRows = newStudents.map(s => {
    const r = toRow(s, !!s.present);
    if (!s.present) {
      delete r["Payment Method"];
      delete r["Quantity"];
      delete r["Total Amount"];
    }
    return r;
  });

  const presentSheet = XLSX.utils.json_to_sheet(presentRows);
  const absentSheet = XLSX.utils.json_to_sheet(absentRows);
  const newSheet = XLSX.utils.json_to_sheet(newRows);

  XLSX.utils.book_append_sheet(wb, presentSheet, "Present List");
  XLSX.utils.book_append_sheet(wb, absentSheet, "Absent List");
  if (newStudents.length > 0) {
    XLSX.utils.book_append_sheet(wb, newSheet, "New Students");
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

module.exports = { parseStudentsFromExcel, buildAttendanceWorkbook };


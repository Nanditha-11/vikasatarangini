const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function fixSpecificDoc() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.useDb('vikasatarangini_vikasatarangini');
  const col = db.collection('attendances');
  const studentCol = db.collection('students');
  
  const targetId = new mongoose.Types.ObjectId('69c61532490c5b71840e7821');
  const oldDoc = await col.findOne({ _id: targetId });
  
  if (!oldDoc) {
    console.log("Document not found in vikasatarangini_vikasatarangini");
    process.exit(0);
  }
  
  console.log("Found record for date:", oldDoc.date);
  
  const allStudents = await studentCol.find({}).toArray();
  const studentMap = new Map(allStudents.map(s => [String(s.slNo).trim(), s]));
  
  const toInsert = (oldDoc.presentStudents || []).map(p => {
    const s = studentMap.get(String(p.slNo).trim()) || {};
    return {
      date: oldDoc.date,
      slNo: String(p.slNo).trim(),
      name: s.name || "Unknown",
      fatherName: s.fatherName || "",
      phone: s.phone || "",
      age: s.age || 0,
      paymentMethod: p.paymentMethod || "Cash",
      quantity: p.quantity || 0,
      remark: p.remark || "",
      district: oldDoc.district || "",
      place: oldDoc.place || "",
      createdBy: oldDoc.createdBy || "vikasatarangini",
      message: oldDoc.message || "",
      openingStock: oldDoc.openingStock || 0,
      createdAt: oldDoc.createdAt || new Date(),
      updatedAt: new Date()
    };
  });
  
  if (toInsert.length > 0) {
    await col.deleteMany({ date: oldDoc.date }); 
    await col.insertMany(toInsert);
    console.log(`Inserted ${toInsert.length} separate records for date ${oldDoc.date}`);
  } else {
    await col.deleteOne({ _id: targetId });
    console.log("Deleted empty record.");
  }
  
  console.log("Cleanup finished.");
  process.exit(0);
}
fixSpecificDoc();

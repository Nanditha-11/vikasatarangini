const XLSX = require('xlsx'); 
const mongoose = require('mongoose'); 
const URI = 'mongodb://localhost:27017/vikasatarangini'; 

mongoose.connect(URI).then(async () => { 
  try { 
    console.log('Connecting to database...');
    const workbook = XLSX.readFile('c:/Users/nandi/Documents/sridevi-2.xlsx'); 
    const sheet = workbook.Sheets[workbook.SheetNames[0]]; 
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }); 
    
    // Check if first row is data or header. 
    // In sridevi-2.xlsx it is data.
    const Student = mongoose.model('Student', new mongoose.Schema({ 
      slNo: String, 
      name: String, 
      fatherName: String, 
      age: Number, 
      phone: String 
    })); 

    console.log('Wiping existing students...');
    await Student.deleteMany({}); 

    const ops = data
      .filter(row => row[1]) // Must have a name
      .map((row, idx) => {
        const slNo = String(row[0] || (idx + 1));
        return { 
          updateOne: { 
            filter: { slNo }, 
            update: { 
              $set: { 
                slNo, 
                name: String(row[1] || '').trim(), 
                fatherName: String(row[2] || '').trim(), 
                age: (row[3] && Number.isFinite(Number(row[3]))) ? Number(row[3]) : null, 
                phone: String(row[4] || '').trim() 
              } 
            }, 
            upsert: true 
          } 
        };
      }); 

    if (ops.length > 0) {
      const res = await Student.bulkWrite(ops); 
      console.log(`Successfully Imported ${ops.length} Students from sridevi-2.xlsx`);
    } else {
      console.log('No students found to import.');
    }

    const Attendance = mongoose.model('Attendance', new mongoose.Schema({ date: String })); 
    await Attendance.deleteMany({}); 
    console.log('Cleaned all attendance records for a fresh start.');

  } catch (err) { 
    console.error('Error during import:', err.message); 
  } finally { 
    process.exit(0); 
  } 
});

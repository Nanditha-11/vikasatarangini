const fetch = require('node-fetch');

async function test() {
  const adminDetails = { 
    username: 'vikasatarangini', 
    password: 'jeeyarswamy',
    district: 'Karimnagar',
    place: 'Huzurabad'
  };

  const loginRes = await fetch('http://localhost:5050/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adminDetails)
  });
  const { token } = await loginRes.json();
  if (!token) {
    console.error('Login failed');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  console.log('Testing for date:', today);

  // 1. Mark student 106 as present
  console.log('Saving attendance for student 106...');
  await fetch(`http://localhost:5050/api/attendance/${today}/save`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      presentStudents: [{ slNo: "106", quantity: 1, paymentMethod: "Cash" }],
      openingStock: 100,
      message: "Test save"
    })
  });

  // 2. Fetch it back
  console.log('Loading attendance back...');
  const res = await fetch(`http://localhost:5050/api/attendance/${today}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  const s106 = data.students.find(s => s.slNo === 106 || s.slNo === "106");
  if (s106) {
    console.log(`Student 106 "present" status: ${s106.present}`);
  } else {
    console.log('Student 106 not found in response!');
  }
}

test().catch(console.error);

async function testApi() {
  try {
    const res = await fetch('http://localhost:5000/api/rider/jobs');
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testApi();

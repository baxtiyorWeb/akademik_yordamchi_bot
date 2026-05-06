
const keys = [
  "AIzaSyCNPmwdiObSV6nvAeCiDdOeXZ-a2rCIANs",
  "AIzaSyAEO8E7RKx_c76WFNE8mTNjVMW5X46xh3g",
  "AIzaSyAt8rnjeczSo0BxWfsLhOnjOrcOB8WTM84",
  "AIzaSyDrJ3SLQ2zkdGDZaamyEJe3ZHUnXvp37ok"
];

async function checkKeys() {
  for (const key of keys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Key: ${key.substring(0, 10)}... Status: ${data.error ? data.error.message : "VALID"}`);
    } catch (error) {
      console.log(`Key: ${key.substring(0, 10)}... Error`);
    }
  }
}

checkKeys();

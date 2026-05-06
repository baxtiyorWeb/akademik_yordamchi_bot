
const API_KEY = "AIzaSyAGmqqYu9jEPhwYA6w7CrZbx_VHhFneU4Q"; // First key from the list
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function checkModels() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

checkModels();

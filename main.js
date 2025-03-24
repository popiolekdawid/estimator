import { supabase } from "./supabase.js";

const taskId = document.getElementById("taskId");
const username = document.getElementById("username");
const estimate = document.getElementById("estimate");
const result = document.getElementById("result");
const countdownEl = document.getElementById("countdown");

function updateHours() {
  const estimate = document.getElementById('estimate').value;
  const display = document.getElementById('estimate-display');
  display.textContent = estimate + ' hour' + (estimate > 1 ? 's' : '');
  display.style.color = `rgb(${(estimate / 64) * 255}, 50, 50)`;
}
window.updateHours = updateHours;

document.getElementById("estimationForm").addEventListener("submit", submitForm);

async function submitForm(event) {
  event.preventDefault();
  const taskIdValue = taskId.value.trim();
  const usernameValue = username.value.trim();
  const estimateValue = Number(estimate.value);
  if (!taskIdValue || !estimateValue) {
    alert("Please provide the required fields.");
    return;
  }
  const entry = [{
    task_id: taskIdValue,
    user_name: usernameValue,
    estimate: estimateValue
  }];
  await supabase.from("votes").insert(entry);
  window.location.href = `results.html?taskId=${taskIdValue}`;
}

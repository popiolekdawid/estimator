import { supabase } from "./supabase.js";

const taskId = document.getElementById("taskId");
const userNameInput = document.getElementById("userNameInput");
const estimateInput = document.getElementById("estimateInput");
const result = document.getElementById("result");
const countdownEl = document.getElementById("countdown");

document.getElementById("voteBtn").onclick = async () => {
  await supabase.from("votes").insert([
    {
      task_id: taskId.value,
      user_name: userNameInput.value,
      estimate: Number(estimateInput.value)
    }
  ]);
  estimateInput.value = "";
};

document.getElementById("revealBtn").onclick = async () => {
  let timer = 3;
  countdownEl.textContent = `Revealing in ${timer}...`;
  const intervalId = setInterval(() => {
    timer--;
    countdownEl.textContent = `Revealing in ${timer}...`;
    if (timer <= 0) {
      clearInterval(intervalId);
      revealAverage();
    }
  }, 1000);
};

function weightedEstimate(estimates) {
    // Step 1: Find the median
    const sorted = [...estimates].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    // Step 2: Calculate weights (inverse of distance from median, with a minimum cap)
    const weights = estimates.map(e => {
        const distance = Math.abs(e - median);
        return distance === 0 ? 2 : 1 / (distance + 1); // Avoid division by zero, prioritize median values
    });

    // Step 3: Compute weighted average
    const weightedSum = estimates.reduce((sum, e, i) => sum + e * weights[i], 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    return weightedSum / totalWeight;
}

async function revealAverage() {
    const { data } = await supabase
        .from("votes")
        .select("estimate")
        .eq("task_id", taskId.value);
    if (data && data.length) {
        const avg = weightedEstimate(data);
        result.textContent = `Average vote: ${avg.toFixed(2)}h`;
    }
    countdownEl.textContent = "";
}
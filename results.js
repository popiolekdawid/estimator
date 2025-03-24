import { supabase } from "./supabase.js";

function weightedEstimate(estimates) {
    const sorted = [...estimates].sort((a, b) => a - b);
    console.log("Sorted:", sorted);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    console.log("Median:", median);

    const weights = estimates.map(e => {
        const distance = Math.abs(e - median);
        return distance === 0 ? 2 : 1 / (distance + 1);
    });
    console.log("Weights:", weights);

    const weightedSum = estimates.reduce((sum, e, i) => sum + e * weights[i], 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    console.log("Weighted sum:", weightedSum, "Total weight:", totalWeight);

    return weightedSum / totalWeight;
}

async function revealAverage() {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("taskId");
    const { data } = await supabase.from("votes").select("estimate").eq("task_id", taskId);

    if (data && data.length) {
        const estimates = data.map(item => item.estimate);
        const avg = weightedEstimate(estimates);
        console.log(avg)
        document.getElementById("average").textContent = `Average: ` + avg + 'h.';
    } else {
        document.getElementById("average").textContent = "No data available.";
    }
    countdownEl.textContent = "";
}

revealAverage();
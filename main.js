// ...no existing code...
import { supabase } from "./supabase.js";

const sessionInput = document.getElementById("sessionInput");
const userInput = document.getElementById("userInput");
const voteInput = document.getElementById("voteInput");
const result = document.getElementById("result");
const countdownEl = document.getElementById("countdown");

document.getElementById("voteBtn").onclick = async () => {
  await supabase.from("votes").insert([
    {
      session_id: sessionInput.value,
      user_id: userInput.value,
      vote: Number(voteInput.value)
    }
  ]);
  voteInput.value = "";
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

async function revealAverage() {
  const { data } = await supabase
    .from("votes")
    .select("vote")
    .eq("session_id", sessionInput.value);
  if (data && data.length) {
    const avg = data.reduce((acc, curr) => acc + curr.vote, 0) / data.length;
    result.textContent = `Average vote: ${avg.toFixed(2)}h`;
  }
  countdownEl.textContent = "";
}

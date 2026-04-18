import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const estimateObjectiveCosts = async (objectives, destinationName) => {

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2 //rez mai stabile
    }
  });

  const prompt = `You are a travel cost estimation expert. City: ${destinationName}
Use typical tourist prices in ${destinationName}.
Estimate the typical cost per person in EUR for visiting each place.

Rules:
- Museums / attractions / monuments → adult entrance ticket
- Cafes → average price of coffee + small snack
- Restaurants → average lunch price per person
- Parks / squares / streets / churches without entrance fee → 0
- If unsure, estimate a realistic local price based on typical tourist costs in this city.

Return ONLY JSON.
Return integer values only.
Format:
[
  {"id_objective": number, "estimated_cost": number}
]

Places:
${objectives.map(o =>
  `${o.id_objective} - ${o.title}${o.category ? ` (category: ${o.category})` : ""}`).join("\n")}
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // elimina eventuale blocuri markdown
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);

    return parsed.map(item => ({
      id_objective: item.id_objective,
      estimated_cost: Math.min(100, Math.max(0, Math.round(item.estimated_cost || 0)))
    }));

  } catch (err) {
    console.error("Eroare la gemini-2.5-flash, încerc gemini-2.0-flash...", err.message);

    try {
      const fallback1 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const res = await fallback1.generateContent(prompt);
      let text = res.response.text().replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (e) {
      console.error("Eroare la gemini-2.0-flash, încerc gemini-1.5-flash...", e.message);

      try {
        const fallback2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const res = await fallback2.generateContent(prompt);
        let text = res.response.text().replace(/```json/gi, "").replace(/```/g, "").trim();
        return JSON.parse(text);
      } catch (e2) {
        console.error("Eroare la gemini-1.5-flash-latest, încerc gemini-1.5-flash-8b...", e2.message);

        try {
          const fallback3 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
          const res = await fallback3.generateContent(prompt);
          let text = res.response.text().replace(/```json/gi, "").replace(/```/g, "").trim();
          return JSON.parse(text);
        } catch (e3) {
          console.error("Eroare și la gemini-1.5-flash-8b:", e3.message);
          throw new Error("Toate modelele AI sunt indisponibile momentan. Încearcă din nou mai târziu.");
        }
      }
    }
  }
};
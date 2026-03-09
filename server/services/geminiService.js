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
    console.error("Eroarea la modelul cu JSON schema. Incercam fallback la modelul de baza...", err);

    try {
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const res = await fallbackModel.generateContent(prompt);
      let text = res.response.text().replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (e) {
      console.error("Eroare si la fallback...", e);
      return objectives.map(o => ({ id_objective: o.id_objective, estimated_cost: 0 }));
    }
  }
};
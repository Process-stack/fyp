import OpenAI from "openai";

export async function createAdvisory({ resumeText, jobDescription, score, pillars, keywords }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error("The optional advisory is not configured. Set OPENAI_API_KEY to enable it."),
      { status: 503 }
    );
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content:
          "Give concise, practical writing suggestions for a resume against a job description. Ground every suggestion in supplied text, do not infer protected traits or assess candidate worth, and do not recommend hiring decisions. Do not recalculate or override deterministic scores. State that this is optional, non-authoritative advice."
      },
      {
        role: "user",
        content: JSON.stringify({
          deterministicScore: score,
          pillarScores: pillars,
          matchedTerms: keywords.matched.slice(0, 20),
          missingTerms: keywords.missing.slice(0, 20),
          resumeExcerpt: resumeText.slice(0, 10000),
          jobDescriptionExcerpt: jobDescription.slice(0, 6000)
        })
      }
    ]
  });

  const advisory = response.choices[0]?.message?.content?.trim();
  if (!advisory) throw new Error("The advisory provider returned an empty response.");
  return advisory.slice(0, 6000);
}

const https = require("https");
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const body = JSON.parse(event.body);
    const query = body.query;
    const system = body.system;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key not found. Check environment variables." })
      };
    }
    const payload = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: query }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(payload)
        }
      };
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
    const data = JSON.parse(result);
    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Groq API error: " + data.error.message })
      };
    }
    const raw = (data?.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Exception: " + err.message })
    };
  }
};

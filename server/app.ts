import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const TIBYAN_SYSTEM_INSTRUCTION = `**الدور والهوية:**
أنت مساعد ذكي متخصص في القرآن الكريم وعلومه، تعمل ضمن تطبيق مصحف إسلامي. هدفك الأول والأسمى هو مساعدة المستخدمين في البحث عن الآيات، تفسيرها، فهم معاني الكلمات، والتدبر، بناءً على المراجع الإسلامية الموثوقة والمتفق عليها. أنت تتميز بالدقة المتناهية، الأدب الجم، والأسلوب الدافئ والمشجع.

**القاعدة الذهبية (90% تركيز قرآني ومرجعي):**
1. **الدقة المطلقة:** عند كتابة أي آية قرآنية، يجب كتابتها بالتشكيل الصحيح (الرسم العثماني إن أمكن) مع ذكر اسم السورة ورقم الآية بين قوسين. يُمنع منعاً باتاً الخطأ في النص القرآني أو تغييره أو تأليفه.
2. **المراجع المعتمدة:** في أسئلة التفسير وأسباب النزول والأحكام، اعتمد حصراً على أمهات كتب التفسير الموثوقة (مثل: تفسير ابن كثير، الطبري، القرطبي، السعدي، أو الجلالين). اذكر اسم المرجع باختصار عند النقل لتعزيز الموثوقية.
3. **تجنب الفتوى:** أنت لست مفتياً. إذا سألك المستخدم عن حكم فقهي دقيق أو فتوى شرعية، اعتذر بلطف ووجهه لسؤال أهل العلم الموثوقين، مع ذكر الآيات العامة التي تحث على نفس الموضوع إن وجدت.
4. **الابتعاد عن الجدل:** تجنب الخوض في أي نقاشات طائفية، سياسية، أو خلافية عميقة. التزم بالمنهج الوسطي المتفق عليه.

**المساحة التفاعلية (10% مرونة إنسانية وتواصل):**
1. **الرد على التحيات:** إذا ألقى المستخدم السلام أو سأل عن حالك (مثل: "السلام عليكم"، "كيف حالك"، "شكراً")، رد بأسلوب إسلامي دافئ وطبيعي (مثل: "وعليكم السلام ورحمة الله وبركاته، أنا بخير والحمد لله، كيف يمكنني مساعدتك في رحلتك مع القرآن اليوم؟").
2. **التعاطف والدعم:** إذا عبر المستخدم عن حزن، ضيق، أو قلق، تفاعل معه بتعاطف بشري مرن، ثم اربط ذلك بلطف بآية قرآنية أو دعاء يبعث على الطمأنينة. لا تكن آلة صماء بل أظهر تفهماً لمشاعره.
3. **المرونة في المحادثات العابرة:** إذا سأل المستخدم سؤالاً عاماً خارج نطاق القرآن بقليل، أجب باختصار شديد ولباقة، ثم أعد توجيه دفة الحديث بذكاء نحو هدفك الأساسي وهو القرآن الكريم.

**نبرة الصوت (Tone of Voice):**
هادئة، محترمة، مبشرة، ولا تخلو من الود والمرونة الطبيعية.

**أمثلة توضيحية لتدريب البوت (Few-Shot Examples):**
* المستخدم: "كيف حالك اليوم؟"
أنت: "بخير والحمد لله، شكراً لسؤالك! أنا هنا وجاهز لمساعدتك. هل تبحث عن تفسير آية معينة أو تود القراءة في موضوع محدد من القرآن؟"
* المستخدم: "أنا أشعر بضيق شديد وحزن."
أنت: "أسأل الله أن يشرح صدرك ويزيل همك، فالحياة مليئة بالضغوط. تذكر قول الله تعالى في سورة الشرح: ﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا (5) إِنَّ مَعَ الْعُسْرِ يُسْرًا (6)﴾. هل تحب أن أعرض لك بعض الآيات التي تتحدث عن الصبر والطمأنينة لتستمع أو تقرأها؟"`;

const app = express();

app.use(express.json());

// AI Route
app.post("/api/mood", async (req, res) => {
  try {
    const { mood, type } = req.body;
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
       return res.status(401).json({ error: "Gemini API key is missing. Please add it in settings." });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    let specificInstruction = "";
    switch (type) {
      case "sad":
        specificInstruction = `المستخدم يشعر بالحزن والضيق (عبر عن ذلك بقوله: "${mood}"). اختر آية تبث الأمل وتجبر الخاطر وتواسيه في حزنه.`;
        break;
      case "anxious":
        specificInstruction = `المستخدم يشعر بالقلق والتوتر (عبر عن ذلك بقوله: "${mood}"). اختر آية تبعث على السكينة والطمأنينة وتذكره بأن الأمر كله لله.`;
        break;
      case "hardship":
        specificInstruction = `المستخدم يمر بضائقة ومحنة (عبر عن ذلك بقوله: "${mood}"). اختر آية تبشره بالفرج وتذكره بأن مع العسر يسراً.`;
        break;
      case "peace":
        specificInstruction = `المستخدم يبحث عن الطمأنينة والأمل (عبر عن ذلك بقوله: "${mood}"). اختر آية تملأ قلبه بالسلام والرضا واليقين.`;
        break;
      default:
         specificInstruction = `المستخدم يقول أو يشعر بـ: "${mood}". ابحث عن آية قرآنية (أو آيات مترابطة) تناسب هذا الشعور أو الموضوع وتلامس قلب المستخدم.`;
    }

    const prompt = `${specificInstruction}
قدم النتيجة بصيغة JSON فقط بهذه الهيكلية الدقيقة بدون أي نص إضافي:
{
  "verse": "النص القرآني للآية/الآيات بالتشكيل المظبوط",
  "sura": "اسم السورة",
  "ayahNumber": "رقم الآية (أو الآيات)",
  "tafseer": "تفسير الآية من المراجع المعتمدة بشكل مبسط وواضح",
  "spiritualWord": "رسالة روحانية عميقة ومواساة بناءً على الآية تتناسب مع حالة المستخدم"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: TIBYAN_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    let text = response.text;
    
    // Clean up markdown markers if any
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text);
    
    res.json(parsed);
  } catch (error: any) {
    const isInvalidKey = error?.status === 400 || error?.message?.includes('API key not valid') || error?.message?.includes('API_KEY_INVALID');
    
    if (isInvalidKey) {
      console.error("API Key is invalid or missing.");
      return res.status(401).json({ error: "API key not valid. Please configure a valid GEMINI_API_KEY." });
    }
    
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

// Smart Search Route
app.post("/api/smart-search", async (req, res) => {
  try {
    const { hint } = req.body;
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
       return res.status(401).json({ error: "Gemini API key is missing. Please add it in settings." });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    const prompt = `تبيان الذكي: المستخدم نسي الآية ويبحث عنها باستخدام المعنى أو التلميح التالي: "${hint}".
مهمتك:
1. إيجاد الآية الأقرب والأكثر دقة التي يقصدها المستخدم. يجب أن تكون الآية صحيحة 100% وبدون خطأ وبنص الرسم العثماني إن أمكن.
2. استخراج اسم السورة ورقم الآية.
3. كتابة تفسير مختصر.
4. إعطاء نبذة ذكية ومباشرة توضح للمستخدم كيف تتطابق هذه الآية مع ما يبحث عنه.

أرجع النتيجة بصيغة JSON فقط بهذه الهيكلية الدقيقة:
{
  "verse": "النص القرآني للآية (صحيح بـ 100%)",
  "sura": "اسم السورة",
  "ayahNumber": "رقم الآية",
  "tafseer": "تفسير مختصر جداً يوضح المعنى العام للآية",
  "spiritualWord": "رد من المساعد يخبر المستخدم بربط الآية بالتلميح الذي سأل عنه (مثال: هذه هي الآية التي تبحث عنها، وتعني...)"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: TIBYAN_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    let text = response.text;
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error("Smart Search Error:", error);
    res.status(500).json({ error: "Failed to perform smart search" });
  }
});

// Tibyan AI Chat Route
app.post("/api/tibyan", async (req, res) => {
  try {
    const { message, contextAyah } = req.body;
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
       return res.status(401).json({ error: "API key not valid. Please configure a valid GEMINI_API_KEY." });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    const prompt = contextAyah 
        ? `سياق الآية الحالية: ${contextAyah}\n\nسؤال المستخدم: ${message}`
        : `سؤال المستخدم: ${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: TIBYAN_SYSTEM_INSTRUCTION,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    const isInvalidKey = error?.status === 400 || error?.message?.includes('API key not valid') || error?.message?.includes('API_KEY_INVALID');
    
    if (isInvalidKey) {
      console.error("API Key is invalid or missing.");
      return res.status(401).json({ error: "API key not valid. Please configure a valid GEMINI_API_KEY." });
    }
    
    console.error(error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default app;

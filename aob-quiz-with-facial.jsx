import { useState, useRef, useCallback } from "react";

const COLORS = {
  bg: "#08090d",
  card: "#0f1218",
  border: "#1e2330",
  teal: "#4ade80",
  blue: "#60d4f7",
  amber: "#fb923c",
  red: "#f87171",
  text: "#f0f2f8",
  muted: "#8890a0",
  dim: "#3a4050",
};

const QUESTIONS = [
  { id: 1, question: "When you wake up in the morning, your first feeling is usually...", options: [{ text: "Rested and ready", score: 0 }, { text: "Okay, takes a moment to settle", score: 1 }, { text: "Already thinking about what needs doing", score: 2 }, { text: "Exhausted before the day begins", score: 3 }] },
  { id: 2, question: "In a difficult conversation, your body tends to...", options: [{ text: "Stay open and present", score: 0 }, { text: "Tighten slightly but you manage", score: 1 }, { text: "Go into defence — chest tight, mind racing", score: 2 }, { text: "Shut down or want to escape", score: 3 }] },
  { id: 3, question: "How often do you feel genuinely calm — not just busy or distracted?", options: [{ text: "Most of the time", score: 0 }, { text: "Sometimes, usually after exercise or nature", score: 1 }, { text: "Rarely — calm feels almost foreign", score: 2 }, { text: "I can't remember the last time", score: 3 }] },
  { id: 4, question: "Your breathing right now is...", options: [{ text: "Slow and deep, into the belly", score: 0 }, { text: "Normal, I think", score: 1 }, { text: "Shallow — mostly in the chest", score: 2 }, { text: "I hold my breath without realising", score: 3 }] },
  { id: 5, question: "When something goes wrong unexpectedly, you...", options: [{ text: "Pause, breathe, respond", score: 0 }, { text: "Feel a spike but recover fairly quickly", score: 1 }, { text: "React first, reflect much later", score: 2 }, { text: "Spiral — it stays with you for hours or days", score: 3 }] },
  { id: 6, question: "Your sleep quality over the last month has been...", options: [{ text: "Deep and restorative", score: 0 }, { text: "Mostly fine with occasional rough nights", score: 1 }, { text: "Light, broken or restless", score: 2 }, { text: "A problem — I dread it or can't switch off", score: 3 }] },
  { id: 7, question: "When you sit in silence, your inner experience is...", options: [{ text: "Peaceful — I welcome it", score: 0 }, { text: "Neutral — I can sit with it", score: 1 }, { text: "Uncomfortable — I reach for my phone", score: 2 }, { text: "Overwhelming — thoughts flood in", score: 3 }] },
];

const RESULT_STATES = [
  { range: [0, 6], state: "Deeply Regulated", color: "#4ade80", glow: "#4ade8033", summary: "Your nervous system is operating from genuine safety and rest. You have strong foundations.", armPitch: "ARM will take you from regulated to masterful — teaching you to guide others from this place of embodied calm." },
  { range: [7, 11], state: "Balanced but Brittle", color: "#60d4f7", glow: "#60d4f733", summary: "Mostly functioning well, but there's a fragility under the surface. Stress tips you faster than you'd like.", armPitch: "ARM was built for exactly this — the gap between managing fine and truly thriving. Learn to regulate on demand." },
  { range: [12, 16], state: "Running on Stress", color: "#fb923c", glow: "#fb923c33", summary: "Your nervous system has been carrying significant load. Adaptation isn't the same as regulation.", armPitch: "ARM was designed for people here — high-functioning but quietly exhausted. Breathwork isn't relaxation. It's a rewiring." },
  { range: [17, 21], state: "Dysregulated & Depleted", color: "#f87171", glow: "#f8717133", summary: "Running on empty. The nervous system has been in survival mode too long. Biology can change with the right tools.", armPitch: "This is exactly why ARM exists. Not a quick fix — a real path back to yourself. You deserve to feel safe in your own body." },
];

const getQuizResult = (score) => RESULT_STATES.find(r => score >= r.range[0] && score <= r.range[1]) || RESULT_STATES[2];
const ARM_URL = "https://alchemyofbreath.com/arm";

export default function App() {
  const [phase, setPhase] = useState("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [quizScore, setQuizScore] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("");
  const [facialData, setFacialData] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const progress = ((current) / QUESTIONS.length) * 100;

  const handleAnswer = (score) => {
    setSelected(score);
    setTimeout(() => {
      const newAnswers = [...answers, score];
      setAnswers(newAnswers);
      setSelected(null);
      if (current + 1 < QUESTIONS.length) {
        setCurrent(current + 1);
      } else {
        const total = newAnswers.reduce((a, b) => a + b, 0);
        setQuizScore(total);
        setPhase("email");
      }
    }, 380);
  };

  const handleEmailSubmit = () => {
    if (!name.trim()) { setEmailError("Please enter your first name."); return; }
    if (!email.includes("@") || !email.includes(".")) { setEmailError("Please enter a valid email."); return; }
    setPhase("facial");
  };

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      setCameraError("Camera access denied. Please allow camera access and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);

    // Capture frame
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = imageData.split(",")[1];
    setCapturedImage(imageData);
    stopCamera();
    setCapturing(false);
    setAnalyzing(true);

    const stages = [
      "Reading facial geometry",
      "Analysing micro-expressions",
      "Detecting tension patterns",
      "Mapping nervous system indicators",
      "Synthesising your reading",
    ];
    let i = 0;
    const stageInterval = setInterval(() => {
      if (i < stages.length) { setAnalysisStage(stages[i]); i++; }
    }, 900);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an expert in somatic psychology and nervous system regulation with deep knowledge of facial micro-expressions, muscle tension patterns, and autonomic nervous system indicators visible in the face. Analyse the facial image provided and return ONLY a JSON object with no preamble or markdown. The JSON must have exactly these fields:
{
  "nsScore": <integer 0-100, where 0=deeply regulated, 100=highly dysregulated>,
  "primaryState": <one of: "Regulated", "Mild Activation", "Moderate Stress", "High Stress", "Dysregulated">,
  "keyIndicators": [<array of 3 specific observations about the face, each under 12 words>],
  "muscleTension": <"Low" | "Moderate" | "High">,
  "eyeState": <brief observation about eyes, under 10 words>,
  "jawState": <brief observation about jaw/lower face, under 10 words>,
  "overallReading": <2 sentences max, compassionate and specific, under 40 words>,
  "confidence": <"High" | "Medium" | "Low" — based on image quality>
}`,
          messages: [{
            role: "user",
            content: [{
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64 }
            }, {
              type: "text",
              text: "Analyse this face for nervous system state indicators. Return only the JSON object."
            }]
          }]
        })
      });

      clearInterval(stageInterval);
      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setFacialData(parsed);

      // Combine quiz score + facial score for final result
      const quizResult = getQuizResult(quizScore);
      const combinedScore = Math.round((quizScore / 21 * 100 * 0.5) + (parsed.nsScore * 0.5));
      setFinalResult({
        quizResult,
        facialData: parsed,
        combinedScore,
        quizScore,
      });
      setAnalyzing(false);
      setPhase("results");

    } catch (err) {
      clearInterval(stageInterval);
      // Fallback: use quiz score only
      const quizResult = getQuizResult(quizScore);
      setFinalResult({ quizResult, facialData: null, combinedScore: Math.round(quizScore / 21 * 100), quizScore });
      setAnalyzing(false);
      setPhase("results");
    }
  }, [quizScore, stopCamera]);

  const skipFacial = () => {
    stopCamera();
    const quizResult = getQuizResult(quizScore);
    setFinalResult({ quizResult, facialData: null, combinedScore: Math.round(quizScore / 21 * 100), quizScore });
    setPhase("results");
  };

  const getNSColor = (score) => {
    if (score <= 25) return COLORS.teal;
    if (score <= 50) return COLORS.blue;
    if (score <= 75) return COLORS.amber;
    return COLORS.red;
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Palatino Linotype', Palatino, serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scanLine { 0%{top:-4px} 100%{top:100%} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        input { outline:none; }
      `}</style>

      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div style={{ width: "100%", maxWidth: 500 }}>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div style={{ textAlign: "center", animation: "fadeUp 0.6s ease" }}>
            <div style={{ fontSize: 52, marginBottom: 16, animation: "breathe 4s ease infinite" }}>🫁</div>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", color: COLORS.dim, textTransform: "uppercase", marginBottom: 10 }}>Alchemy of Breath</div>
            <h1 style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.3, marginBottom: 12 }}>What State Is Your<br />Nervous System In?</h1>
            <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 32px" }}>7 questions and a real-time facial reading. The most precise nervous system assessment you've taken.</p>
            <button onClick={() => setPhase("quiz")} style={{ background: "linear-gradient(135deg, #1a4a3a, #0d2e24)", border: "1px solid #4ade8055", borderRadius: 14, padding: "18px 48px", fontSize: 15, color: COLORS.teal, cursor: "pointer", letterSpacing: "0.06em", boxShadow: "0 0 40px #4ade8020" }}>
              Begin Assessment →
            </button>
            <div style={{ marginTop: 20, fontSize: 12, color: COLORS.dim }}>7 questions · Facial scan · 3 minutes</div>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: COLORS.dim, letterSpacing: "0.1em" }}>QUESTION {current + 1} OF {QUESTIONS.length}</span>
                <span style={{ fontSize: 11, color: COLORS.dim }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 3, background: "#1a1e28", borderRadius: 2 }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, #4ade80, #60d4f7)", borderRadius: 2, width: `${progress}%`, transition: "width 0.4s ease", boxShadow: "0 0 8px #4ade8044" }} />
              </div>
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 400, lineHeight: 1.45, marginBottom: 28 }}>{QUESTIONS[current].question}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {QUESTIONS[current].options.map((opt, i) => {
                const isSel = selected === opt.score && selected !== null;
                return (
                  <button key={i} onClick={() => selected === null && handleAnswer(opt.score)} style={{ background: isSel ? "#4ade8014" : COLORS.card, border: `1px solid ${isSel ? "#4ade80" : COLORS.border}`, borderRadius: 12, padding: "16px 20px", textAlign: "left", cursor: "pointer", color: isSel ? COLORS.teal : "#c8cad8", fontSize: 15, lineHeight: 1.4, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${isSel ? "#4ade80" : "#2a3040"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, color: isSel ? COLORS.teal : COLORS.dim }}>{String.fromCharCode(65 + i)}</span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── EMAIL GATE ── */}
        {phase === "email" && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✦</div>
              <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Quiz complete.</h2>
              <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6 }}>One more step — a live facial reading to complete your nervous system profile. Enter your details to continue.</p>
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "28px 24px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: COLORS.dim, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>First Name</label>
                <input value={name} onChange={e => { setName(e.target.value); setEmailError(""); }} placeholder="Your first name" style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 15, color: COLORS.text, fontFamily: "inherit" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: COLORS.dim, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email Address</label>
                <input value={email} onChange={e => { setEmail(e.target.value); setEmailError(""); }} placeholder="your@email.com" type="email" style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 15, color: COLORS.text, fontFamily: "inherit" }} />
              </div>
              {emailError && <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 14 }}>{emailError}</div>}
              <button onClick={handleEmailSubmit} style={{ width: "100%", background: "linear-gradient(135deg, #1a4a3a, #0d2e24)", border: "1px solid #4ade8055", borderRadius: 12, padding: 16, fontSize: 15, color: COLORS.teal, cursor: "pointer", letterSpacing: "0.05em" }}>
                Continue to Facial Reading →
              </button>
              <div style={{ fontSize: 11, color: COLORS.dim, textAlign: "center", marginTop: 12 }}>No spam. Unsubscribe anytime.</div>
            </div>
          </div>
        )}

        {/* ── FACIAL SCAN ── */}
        {phase === "facial" && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            {!analyzing ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Facial Nervous System Reading</h2>
                  <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6 }}>
                    {!cameraActive ? "Allow camera access and position your face in the frame. Good lighting helps." : "Hold still. When ready, capture your reading."}
                  </p>
                </div>

                {/* Camera viewport */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#05060a", borderRadius: 20, overflow: "hidden", border: `1px solid ${cameraActive ? "#4ade8044" : COLORS.border}`, marginBottom: 20 }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: cameraActive ? "block" : "none" }} />

                  {!cameraActive && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                      <div style={{ fontSize: 40 }}>📷</div>
                      <div style={{ fontSize: 13, color: COLORS.dim }}>Camera not active</div>
                    </div>
                  )}

                  {cameraActive && (
                    <>
                      {/* Face guide overlay */}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <div style={{ width: "55%", height: "75%", border: "1px dashed #4ade8055", borderRadius: "50%", boxShadow: "0 0 0 1000px rgba(0,0,0,0.35)" }} />
                      </div>
                      {/* Scan line */}
                      <div style={{ position: "absolute", left: "22.5%", width: "55%", height: 1, background: "linear-gradient(90deg, transparent, #4ade80, transparent)", animation: "scanLine 2.5s ease-in-out infinite", boxShadow: "0 0 8px #4ade80" }} />
                      <div style={{ position: "absolute", top: 12, left: 0, right: 0, textAlign: "center" }}>
                        <span style={{ background: "#0a0c0f99", border: "1px solid #4ade8033", borderRadius: 20, padding: "4px 14px", fontSize: 11, color: COLORS.teal, letterSpacing: "0.1em" }}>● LIVE</span>
                      </div>
                    </>
                  )}

                  {capturing && (
                    <div style={{ position: "absolute", inset: 0, background: "white", opacity: 0.7, borderRadius: 20 }} />
                  )}
                </div>

                {cameraError && (
                  <div style={{ background: "#2a0a0a", border: "1px solid #f8717144", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: COLORS.red }}>
                    {cameraError}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {!cameraActive ? (
                    <button onClick={startCamera} style={{ width: "100%", background: "linear-gradient(135deg, #1a4a3a, #0d2e24)", border: "1px solid #4ade8055", borderRadius: 14, padding: 18, fontSize: 15, color: COLORS.teal, cursor: "pointer", letterSpacing: "0.05em" }}>
                      Activate Camera
                    </button>
                  ) : (
                    <button onClick={captureAndAnalyze} style={{ width: "100%", background: "linear-gradient(135deg, #1a4a3a, #0d2e24)", border: "1px solid #4ade8055", borderRadius: 14, padding: 18, fontSize: 15, color: COLORS.teal, cursor: "pointer", letterSpacing: "0.05em", boxShadow: "0 0 30px #4ade8022" }}>
                      Capture Reading →
                    </button>
                  )}
                  <button onClick={skipFacial} style={{ width: "100%", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14, fontSize: 13, color: COLORS.dim, cursor: "pointer" }}>
                    Skip — use quiz results only
                  </button>
                </div>
              </>
            ) : (
              /* Analyzing state */
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                {capturedImage && (
                  <div style={{ width: 120, height: 120, borderRadius: "50%", overflow: "hidden", margin: "0 auto 24px", border: `2px solid ${COLORS.teal}`, boxShadow: `0 0 30px #4ade8033` }}>
                    <img src={capturedImage} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                  </div>
                )}
                <div style={{ width: 48, height: 48, border: `2px solid ${COLORS.border}`, borderTop: `2px solid ${COLORS.teal}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
                <div style={{ fontSize: 14, color: COLORS.teal, animation: "pulse 1.5s ease infinite", marginBottom: 8 }}>{analysisStage}</div>
                <div style={{ fontSize: 12, color: COLORS.dim }}>Reading your nervous system state...</div>
              </div>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && finalResult && (
          <div style={{ animation: "fadeUp 0.6s ease" }}>
            {/* Combined score header */}
            <div style={{ textAlign: "center", background: COLORS.card, border: `1px solid ${finalResult.quizResult.color}33`, borderRadius: 20, padding: "32px 24px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 0%, ${finalResult.quizResult.glow}, transparent 65%)` }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", color: COLORS.dim, textTransform: "uppercase", marginBottom: 6 }}>
                  {finalResult.facialData ? "Quiz + Facial Reading" : "Quiz Result"}
                </div>
                <div style={{ fontSize: 56, fontFamily: "monospace", fontWeight: 700, color: finalResult.quizResult.color, lineHeight: 1, marginBottom: 4 }}>
                  {finalResult.combinedScore}
                </div>
                <div style={{ fontSize: 12, color: COLORS.dim, marginBottom: 14 }}>nervous system score</div>
                <h1 style={{ fontSize: 26, fontWeight: 400, color: finalResult.quizResult.color, marginBottom: 10 }}>{finalResult.quizResult.state}</h1>
                <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.65 }}>{finalResult.quizResult.summary}</p>
              </div>
            </div>

            {/* Facial analysis detail */}
            {finalResult.facialData && (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: COLORS.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                  Facial Reading
                  {finalResult.facialData.confidence && (
                    <span style={{ marginLeft: 8, color: finalResult.facialData.confidence === "High" ? COLORS.teal : COLORS.amber }}> · {finalResult.facialData.confidence} confidence</span>
                  )}
                </div>

                {capturedImage && (
                  <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
                      <img src={capturedImage} alt="face" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, marginBottom: 8 }}>{finalResult.facialData.overallReading}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[
                          { label: "Tension", value: finalResult.facialData.muscleTension, colors: { Low: COLORS.teal, Moderate: COLORS.amber, High: COLORS.red } },
                          { label: "State", value: finalResult.facialData.primaryState, colors: {} },
                        ].map(m => (
                          <span key={m.label} style={{ background: "#1a1e28", border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: m.colors[m.value] || COLORS.muted }}>
                            {m.label}: {m.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {finalResult.facialData.keyIndicators && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {finalResult.facialData.keyIndicators.map((ind, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: finalResult.quizResult.color, marginTop: 6, flexShrink: 0 }} />
                        <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{ind}</div>
                      </div>
                    ))}
                  </div>
                )}

                {finalResult.facialData.eyeState && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                    {[{ label: "Eyes", value: finalResult.facialData.eyeState }, { label: "Jaw", value: finalResult.facialData.jawState }].map(f => (
                      <div key={f.label} style={{ background: "#0a0c0f", borderRadius: 10, padding: "10px 14px", border: `1px solid ${COLORS.border}` }}>
                        <div style={{ fontSize: 10, color: COLORS.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{f.label}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.4 }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Score breakdown */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: COLORS.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Your Spectrum</div>
              <div style={{ display: "flex", gap: 3 }}>
                {[{ label: "Regulated", color: COLORS.teal }, { label: "Balanced", color: COLORS.blue }, { label: "Stressed", color: COLORS.amber }, { label: "Depleted", color: COLORS.red }].map((s, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ height: 6, background: s.color, borderRadius: 3, opacity: finalResult.quizResult.color === s.color ? 1 : 0.18, boxShadow: finalResult.quizResult.color === s.color ? `0 0 10px ${s.color}` : "none" }} />
                    <div style={{ fontSize: 9, color: finalResult.quizResult.color === s.color ? s.color : COLORS.dim, marginTop: 5, textAlign: "center" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ARM recommendation */}
            <div style={{ background: "linear-gradient(135deg, #0d1f18, #0a1510)", border: `1px solid ${finalResult.quizResult.color}44`, borderRadius: 20, padding: 24, marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${finalResult.quizResult.color}, transparent)` }} />
              <div style={{ fontSize: 11, color: finalResult.quizResult.color, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>Your Next Step</div>
              <h3 style={{ fontSize: 18, fontWeight: 400, color: COLORS.text, marginBottom: 10, lineHeight: 1.4 }}>The Autonomic Regulation Method</h3>
              <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.7, marginBottom: 20 }}>{finalResult.quizResult.armPitch}</p>
              <a href={ARM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: `${finalResult.quizResult.color}18`, border: `1px solid ${finalResult.quizResult.color}`, borderRadius: 12, padding: 16, textAlign: "center", color: finalResult.quizResult.color, fontSize: 14, textDecoration: "none", letterSpacing: "0.05em" }}>
                Learn About the ARM Program →
              </a>
            </div>

            {/* Share */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: COLORS.dim, marginBottom: 10 }}>Know someone who needs this?</div>
              <button onClick={() => { if (navigator.share) { navigator.share({ title: "Nervous System Assessment", text: "I just took this facial + quiz nervous system assessment by Alchemy of Breath.", url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); } }} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 24px", color: COLORS.dim, fontSize: 13, cursor: "pointer" }}>
                Share This Assessment
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: COLORS.dim }}>© Alchemy of Breath · alchemyofbreath.com</div>
          </div>
        )}
      </div>
    </div>
  );
}

window.Notebook = window.Notebook || {};
Notebook.data = Notebook.data || {};

// Optional fields per project: role, labels ({ purpose, howItWorks, shot }), sketch, challenges, comparison,
// comparison2, stats ([[number, label]]), team, paper, image, code, evidence (certificate ids),
// links ([{ label, url, kind: 'demo' | 'code', note }]), learned,
// spreads (1 or 2: overrides how many spreads the project gets; code is shown only with 2).
// Anything null or empty is simply not shown.
Notebook.data.projects = [
  {
    // Facts from the project's README, evals and git history (CONFIDENT TALK ANALYZER FILES/test1),
    // and the M.Sc. mini-project report and slides for the first version.
    id: 'confident-talk-analyzer',
    number: '01',
    title: 'Confident Talk Analyzer',
    kind: 'Speech coaching web app · M.Sc. mini project, rebuilt',
    period: { start: '2025-12', end: '2026-10', label: 'Dec 2025 – Mar 2026 · rebuilt Sep – Oct 2026' },
    role: 'Built it end to end',
    summary: 'Practise speaking out loud and get told, specifically, how to get better. Speech models measure how you sound, an AI coach reviews what you said, and progress is tracked session by session.',
    purpose: 'Many people struggle with hesitation, filler words, pacing and a lack of structured feedback, and feedback from others can be inconsistent or unavailable. Built for students, job seekers and public speakers.',
    howItWorks: [
      'Record an answer in the browser in one of 8 practice modes: free practice, interview, JAM, snap talk, read aloud, presentation, pitch, and group discussion or debate.',
      'Silero VAD finds the speech and faster-whisper transcribes it with word timings.',
      'Ten delivery skills are measured in parallel: pace, filler words, hesitation pauses, pitch variation (Praat), vocal confidence (wav2vec2), hedging language, reading accuracy, timing, structure and topic relevance (MiniLM).',
      'They become a 0–10 score and a delivery label such as Confident, Steady or Hesitant.',
      'An LLM coach checks the answer against the mode’s framework (STAR, PREP…), quotes the speaker and rewrites the answer without inventing facts.',
      'Every session is saved, to replay and to see the weakest skills to practise next.'
    ],
    sketch: {
      type: 'flow',
      caption: 'How it works',
      steps: ['Recording: 8 practice modes', 'Speech found and transcribed', '10 delivery skills measured', 'Score + AI coach']
    },
    links: [
      { label: 'Live demo', url: 'https://josephamal10--confident-talk-analyzer-web.modal.run', kind: 'demo', note: 'Try it as a guest · wakes in about 30 s' },
      { label: 'GitHub', url: 'https://github.com/josephamal10/confident-talk-analyzer', kind: 'code' }
    ],
    image: {
      src: 'assets/img/projects/cta-results.webp',
      srcSmall: 'assets/img/projects/cta-results-sm.webp',
      width: 1200,
      height: 976,
      alt: 'Results screen of the Confident Talk Analyzer: overall score, delivery skills and the transcript with filler words marked',
      caption: 'Delivery results, with the transcript and its fillers marked'
    },
    stats: [['8', 'practice modes'], ['10', 'delivery skills measured'], ['94.7%', 'hesitation-pause detection (F1)'], ['265', 'automated tests']],
    comparison: {
      caption: 'Speech pipeline checks · 53 test clips',
      columns: ['Check', 'Result'],
      rows: [
        ['Transcription error (WER)', '0.8%'],
        ['Filler and hedge detection (F1)', '100%'],
        ['Hesitation pauses (F1)', '94.7%, up from 33%'],
        ['Pace (words per minute) error', '0.9%'],
        ['On / off-topic answers', '100%'],
        ['Read-aloud verdicts', '100%, up from 85%'],
        ['Analysis time', '0.77 × the audio length']
      ]
    },
    comparison2: {
      caption: 'Real accents · word error rate',
      columns: ['Whisper model', 'Indian English (Svarah)', 'Own recordings'],
      rows: [
        ['small.en (live demo)', '14.3%', '29.8%'],
        ['distil-large-v3.5', '9.3%', '23.3%'],
        ['large-v3-turbo', '7.9%', '19.3%']
      ]
    },
    challenges: [
      'Hesitation pauses: the first detector found 53% of them; after the fix it finds all of them (F1 33% → 95%).',
      'The coach invented numbers in 6 of 12 tips; a guardrail now replaces any number the speaker never said (none since).',
      'A one-line answer made the coach invent a story; it now gets a fill-in template.',
      'A filler-word prompt made Whisper skip whole sentences in 3 of 4 recordings; stretches with speech but no words are now transcribed again.',
      'Modal ends a web request after 150 seconds, so the analysis runs as a job the page checks on.',
      'The free demo runs small.en, about 5× faster than the larger models on 2 CPU cores.'
    ],
    technologies: ['Python', 'Flask', 'faster-whisper', 'Silero VAD', 'Praat (parselmouth)', 'wav2vec2 (ONNX, int8)', 'MiniLM embeddings', 'LLM coach (Groq gpt-oss-120b)', 'PostgreSQL (Neon) / SQLite', 'Modal', 'GitHub Actions'],
    team: { label: 'Guide (M.Sc. mini project)', members: ['Mrs Anuja, Assistant Professor'] },
    code: null,
    evidence: [],
    learned: null
  },
  {
    id: 'automatic-garage',
    number: '02',
    title: 'Automatic Garage Design using Blynk Cloud Platform',
    kind: 'IoT system · paper presented at ICAC-2024',
    period: { start: '2024-08', end: '2024-09', label: 'Aug – Sep 2024' },
    role: 'Designed and developed the system',
    labels: { shot: 'Prototype', work: 'Prototype, paper and team' },
    spreads: 1,            // one spread: the code excerpt below is left out to keep it to two pages
    summary: 'An IoT-enabled smart garage system for remote monitoring and control through a mobile application.',
    purpose: 'Enhance safety and user convenience through remote monitoring and control of the garage.',
    howItWorks: [
      'Remote monitoring and control of the garage through a mobile application.',
      'Wi-Fi connectivity and cloud services.',
      'Servo-based automation of the garage door.',
      'Real-time security alerts.'
    ],
    sketch: {
      type: 'parts',
      caption: 'Components named in the project description',
      parts: ['Sensors', 'Servo motors', 'Wi-Fi', 'Communication protocols', 'Cloud services', 'Blynk Cloud Platform', 'Mobile application', 'Real-time security alerts']
    },
    technologies: ['Blynk Cloud Platform', 'IoT sensors', 'Servo motors', 'Wi-Fi', 'Communication protocols', 'Cloud services'],
    team: {
      label: 'Names on the conference certificate',
      members: ['Dr. S. R. Vijayalakshmi', 'A. P. Rajesh', 'N. Prem Sai', 'M. V. Dhanvant', 'A. Joseph Amal', 'S. Omprakaash']
    },
    paper: {
      title: 'Automatic Garage Design using Blynk Cloud Platform',
      event: 'International Conference on Advanced Computing (ICAC-2024)',
      organiser: 'Department of Computer Science, Bharathiar University, Coimbatore',
      date: { iso: '2024-09-26', label: '26–27 Sep 2024' },
      evidence: 'cert-icac-2024'
    },
    image: {
      src: 'assets/img/projects/garage-prototype.webp',
      srcSmall: 'assets/img/projects/garage-prototype-600.webp',
      width: 1150,
      height: 920,
      alt: 'Cardboard model of a garage with a hinged door hand-lettered SMART GARAGE, servo wiring visible inside',
      caption: 'Prototype model, from the team’s paper document'
    },
    code: {
      caption: 'Excerpt from the code in the team’s paper document “Smart Garage Utilizing Internet of Things (IoT)”: a Wi-Fi web server on the board; requesting /door/on sweeps two servos.',
      language: null,
      lines: [
        'servo1.attach(15); // Attach servo to GPIO pin 15',
        'servo2.attach(13); // Attach servo to GPIO pin 13',
        '// …',
        'if (header.indexOf("GET /door/on") >= 0) {',
        '  doorstate = "on";',
        '  while (pos < 100) {',
        '    servo1.write(pos);',
        '    servo2.write(180 - pos);',
        '    pos++;',
        '    delay(10);',
        '  }',
        '} else if (header.indexOf("GET /door/off") >= 0) {',
        '  // …'
      ]
    },
    evidence: ['cert-icac-2024'],
    links: [],
    learned: null
  },
  {
    id: 'defi-presentation',
    number: '03',
    title: 'Blockchain Technology in Decentralized Finance (DeFi)',
    kind: 'Paper presented at ATNEAI 2026',
    period: { start: '2026-02', end: '2026-02', label: 'Feb 2026' },
    role: 'Co-presenter',
    paper: {
      title: 'Blockchain Technology in Decentralised Finance',
      event: '13th National Conference, “The Agentic Turn: New Era of Artificial Intelligence” (ATNEAI 2026)',
      organiser: 'Computer Science Stream, Sri Krishna Arts and Science College, Coimbatore',
      date: { iso: '2026-02-24', label: '24 Feb 2026' },
      evidence: 'cert-atneai-2026'
    },
    labels: { purpose: 'Context', howItWorks: 'What it covered', work: 'Comparison, challenges and team' },
    summary: 'A presentation on how blockchain and smart contracts let financial services such as lending, borrowing, trading and payments work without banks or middlemen.',
    purpose: 'Traditional finance depends on intermediaries, which brings high transaction fees, slow processing, low transparency and limited access for many people.',
    howItWorks: [
      'DeFi runs on blockchain through smart contracts: peer-to-peer, automated, transparent and globally accessible. Examples covered: Aave, Uniswap and MakerDAO, mainly on Ethereum.',
      'Smart contracts follow predefined rules and execute transactions automatically when their conditions are met.',
      'Transactions are validated by consensus algorithms such as Proof of Work and Proof of Stake before becoming a permanent record.'
    ],
    challenges: ['Scalability of blockchain networks', 'Smart contract vulnerabilities', 'Security risks', 'Regulatory uncertainty', 'Network congestion', 'High transaction fees during peak usage'],
    comparison: {
      caption: 'Comparison presented',
      columns: ['Parameter', 'Traditional finance', 'DeFi'],
      rows: [
        ['Transaction time', 'Minutes to days', 'Seconds'],
        ['Transaction cost', 'High', 'Low'],
        ['Intermediaries', 'Required', 'Not required'],
        ['Transparency', 'Low', 'High'],
        ['Accessibility', 'Limited', 'Global'],
        ['Control', 'Centralized', 'Decentralized']
      ]
    },
    technologies: ['Blockchain', 'Smart contracts', 'Ethereum', 'Proof of Work', 'Proof of Stake'],
    team: {
      label: 'Presented by',
      members: ['Joseph Amal', 'Prem Sai', 'Omprakaash'],
      affiliation: 'Department of Software Systems, Sri Krishna Arts and Science College'
    },
    image: null,
    code: null,
    evidence: [],
    links: [],
    learned: null
  },
  {
    // Facts from the project's README, CURRENT_STATUS.md, eval files and git history (golf-ai-assistant).
    // Being renamed CaddieAI on GitHub.
    id: 'rag-golf-assistant',
    number: '04',
    title: 'CaddieAI',
    kind: 'Routed RAG with live web search · courserev.ai, at Nanonino',
    period: { start: '2026-08', end: '2026-08', label: 'Aug 2026' },
    role: 'Built it, during an internship at Nanonino',
    labels: { purpose: 'Setting', howItWorks: 'How it answers', work: 'How it answers, in numbers' },
    spreads: 1,            // one spread: the key numbers stand in for the evaluation table
    summary: 'A golf question-answering assistant that cites its sources for every answer, built with retrieval-augmented generation (RAG).',
    purpose: 'Built during an internship at Nanonino, for the software team on the courserev.ai project, to learn LLMs and retrieval-augmented generation.',
    howItWorks: [
      'A follow-up question is rewritten into a full question using the chat history (“he” becomes “Jack Nicklaus”).',
      'A router sends each question one of four ways: the knowledge base (rules, history, players, courses, equipment), live web search (rankings, results, news), published predictions (opinions only, no betting advice), or a polite “golf only”.',
      'Knowledge base: Jina embeddings search 1,802 passages from 143 Wikipedia articles in Pinecone, and a Jina reranker keeps the best 6.',
      'If nothing relevant is found, it says so instead of calling the LLM.',
      'Gemini (or Claude) writes the answer only from those passages, with numbered citations; any citation without a source is removed.'
    ],
    sketch: {
      type: 'flow',
      caption: 'How it answers',
      steps: ['Question (+ chat history)', 'Router: 4 routes', 'Search + rerank: 1,802 passages', 'Answer with citations']
    },
    links: [
      { label: 'GitHub', url: 'https://github.com/josephamal10/CaddieAI', kind: 'code' }
    ],
    image: null,
    stats: [['1,802', 'passages from 143 articles'], ['111/112', 'questions routed correctly'], ['25/25', 'hard questions answered'], ['58', 'automated tests']],
    comparison: {
      caption: 'Evaluation',
      columns: ['Check', 'Result'],
      rows: [
        ['Right article ranked first (answerable questions)', '100%'],
        ['Questions routed correctly', '111 of 112'],
        ['Hard questions answered correctly, end to end', '25 of 25'],
        ['Follow-up questions', '6 of 6'],
        ['Paraphrased questions: rerank off → on', '80% → 100%'],
        ['Automated tests', '58 passing']
      ]
    },
    challenges: [
      'Similarity scores could not tell off-topic questions from answerable ones; a reranker cut-off plus the router fixed it.',
      'The model cited passage numbers that had no source; fixed in the prompt, with a safety net in the pipeline.',
      'The first prediction prompt passed on a betting tip; predictions are now reported as opinions only.'
    ],
    technologies: ['Python', 'FastAPI', 'Retrieval-augmented generation (RAG)', 'Jina embeddings v4', 'Jina reranker', 'Pinecone', 'Gemini API', 'Claude API', 'Google Search grounding', 'Streamlit', 'GitHub Actions'],
    team: null,            // the Setting above names the team
    code: null,
    evidence: [],
    learned: null
  },
  {
    // Figures are from the project documentation, measured on held-out test data.
    id: 'synthetic-voice-detection',
    number: '05',
    title: 'Synthetic Voice Detection System',
    kind: 'Deep learning · voice anti-spoofing · internship at Nanonino',
    period: { start: '2026-08', end: '2026-09', label: 'Aug – Sep 2026' },
    role: 'Built it end to end, as the only developer',
    summary: 'A deep learning system that tells a real human voice from an AI-generated or cloned one, and shows the evidence behind its verdict.',
    purpose: 'Voice cloning can copy a person from a few seconds of audio, which opens the door to fraud and impersonation. The system screens a recording before it is trusted, for fraud prevention and forensic review.',
    howItWorks: [
      'Takes a voice clip, uploaded (WAV, MP3, FLAC) or recorded live in the browser.',
      'Converts it into MFCC features (40 coefficients × 400 frames) with Librosa.',
      'A CNN picks out local spectral patterns, and a bidirectional LSTM follows how they change over time.',
      'Returns Genuine or Synthetic with a confidence score, against a threshold that can be moved for a stricter or more lenient check.',
      'Shows the waveform, spectrogram and MFCCs behind each verdict; signed-in users keep a library of their recordings, and results export to CSV.'
    ],
    sketch: {
      type: 'flow',
      caption: 'How it works',
      steps: ['Voice clip: upload or live recording', 'MFCC features: 40 × 400', 'CNN + BiLSTM: patterns over time', 'Verdict: Genuine or Synthetic + score']
    },
    challenges: [
      'Domain mismatch: trained on studio audio only, the first model flagged three in four real-world genuine voices as fake.',
      'Catastrophic forgetting: fine-tuning on real-world audio alone let most studio fakes through.',
      'Fix: retrain from the first model on both datasets at once, with weighted sampling.',
      'Coverage gap: 120 clips from older TTS engines (SAPI, eSpeak NG) closed it.',
      'Still open: classical voice-conversion attacks (ASVspoof A17–A19).'
    ],
    comparison: {
      caption: 'Accuracy · EER on held-out data, four training rounds',
      columns: ['Model', 'Studio (ASVspoof)', 'Real world'],
      rows: [
        ['1. Baseline', '97.6% · 5.83%', '46.8% · 41.52%'],
        ['2. Fine-tuned, In-the-Wild only', '76.0% · 7.57%', '95.6% · 4.45%'],
        ['3. Both datasets', '97.4% · 8.47%', '96.5% · 3.56%'],
        ['4. Both + classical TTS', '97.6% · 8.33%', '96.1% · 3.60%']
      ]
    },
    technologies: [
      'Python',
      'PyTorch',
      'CNN + BiLSTM',
      'Librosa',
      'MFCC features',
      'ASVspoof 2019',
      'In-the-Wild dataset',
      'Weighted sampling',
      'EER, precision, recall',
      'Google Colab',
      'Streamlit',
      'SQLite + bcrypt'
    ],
    team: null,
    image: {
      src: 'assets/img/projects/svd-detect_results.webp',
      srcSmall: 'assets/img/projects/svd-detect_results-sm.webp',
      width: 1200,
      height: 983,
      alt: 'Detection results for a genuine and a synthetic voice clip, each with its score gauge and verdict',
      caption: 'Detection results for a genuine and a synthetic clip'
    },
    stats: [['96.1%', 'accuracy on real-world audio'], ['3.60%', 'real-world EER'], ['71,237', 'clips in the attack test'], ['≈1 s', 'per clip on a CPU']],
    comparison2: {
      caption: 'Attacks caught by the final model · ASVspoof eval, 71,237 clips',
      columns: ['Attack type', 'Attacks', 'Caught'],
      rows: [
        ['Neural text-to-speech', 'A07–A12', '92.1–100%'],
        ['Hybrid TTS / voice conversion', 'A13–A15', '96.5–99.9%'],
        ['Waveform-concatenation TTS', 'A16', '99.2%'],
        ['Classical voice conversion', 'A17–A19', '16.8–70.2%']
      ]
    },
    code: null,
    evidence: [],
    links: [
      { label: 'Live demo', url: 'https://synthetic-voice-detection.streamlit.app', kind: 'demo', note: 'Continue as guest · wakes in about 30 s' },
      { label: 'GitHub', url: 'https://github.com/josephamal10/synthetic-voice-detection', kind: 'code' }
    ],
    learned: null
  },
  {
    // From the public repo (C:/portfolio/rag-knowledge-base-api: README, code, tests, git history, Oct 2026).
    // The API was built at Nanonino with Aparna, a fellow intern, and shared with Nanonino's permission;
    // the React web app, tests, CI and deployment were added afterwards. Client names were removed from the
    // public repo, so none are named here: the live demo runs on a fictional demo club.
    id: 'rag-knowledge-base-api',
    number: '06',
    title: 'RAG Knowledge Base API',
    kind: 'Full-stack RAG app: NestJS API + React chat · internship at Nanonino',
    period: { start: '2026-09', end: '2026-10', label: 'Sep 2026 · web app Oct 2026' },
    role: 'Built the API with Aparna, a fellow intern, at Nanonino; then added the web app, tests and deployment',
    labels: { purpose: 'What it is for', howItWorks: 'How it answers', shot: 'In use', challenges: 'Design choices', results: 'How it is built and tested', notes: 'Design choices and tools' },
    spreads: 2,
    summary: 'An AI assistant that answers questions using only a business’s own documents, and says so honestly when they do not cover something. Answers stream in word by word, with the sources they came from.',
    purpose: 'Built for golf clubs: each club keeps its own knowledge base (rules, lodging, events, contacts, real estate), loaded from PDF, Word or text files, pasted text or web pages. It is answered through a REST API, a chat web app, or as a tool over MCP for a voice bot. The live demo runs on a fictional demo club.',
    howItWorks: [
      'Documents are split into ~500-character chunks, kept in SQLite and indexed in Upstash Vector, one namespace per club.',
      'A follow-up such as “and check-out?” is rewritten into a full question using the recent conversation.',
      'Gemini picks the topic first; a greeting or a question with nothing behind it gets a clarifying question back.',
      'Hybrid search: Gemini embeddings for meaning and keyword vectors for exact terms, fused by reciprocal rank fusion.',
      'Gemini answers from the passages found only; the answer streams over Server-Sent Events, followed by its sources.'
    ],
    sketch: {
      type: 'flow',
      caption: 'How it answers',
      steps: ['Question + recent chat', 'Follow-up rewritten, topic picked', 'Hybrid search: meaning + keywords', 'Streamed answer + sources']
    },
    links: [
      { label: 'Live demo', url: 'https://rag-knowledge-base-gray.vercel.app', kind: 'demo', note: 'First answer can take up to a minute' },
      { label: 'GitHub', url: 'https://github.com/josephamal10/rag-knowledge-base-api', kind: 'code' }
    ],
    image: {
      src: 'assets/img/projects/rag-kb-chat.webp',
      srcSmall: 'assets/img/projects/rag-kb-chat-sm.webp',
      width: 1200,
      height: 806,
      alt: 'Chat screen of the RAG Knowledge-Base: a question about check-in, a follow-up about check-out understood from context, and the two sources used',
      caption: 'A follow-up understood from context, with the sources used'
    },
    stats: [['55', 'automated tests'], ['15', 'API endpoints'], ['5', 'topics per club'], ['3', 'ways in: REST, chat app, MCP']],
    comparison: {
      caption: 'What runs where · live since Oct 2026',
      columns: ['Part', 'Built with', 'Runs on'],
      rows: [
        ['API', 'NestJS, TypeScript', 'Render'],
        ['Chat web app', 'React 19, Vite', 'Vercel'],
        ['Search index', 'Upstash Vector (hybrid)', 'Upstash'],
        ['Documents', 'SQLite, TypeORM', 'API server'],
        ['Docs for developers', 'Swagger / OpenAPI', '/api'],
        ['Tool for AI agents', 'Model Context Protocol', '/mcp and stdio'],
        ['Local start', 'Docker Compose, nginx', 'one command']
      ]
    },
    comparison2: {
      caption: 'Automated tests · run on every push (GitHub Actions)',
      columns: ['What is tested', 'Tests'],
      rows: [
        ['Answer pipeline and streaming', '12'],
        ['Chunking', '7'],
        ['Keyword (sparse) vectors', '7'],
        ['Follow-up rewriting', '6'],
        ['Topic routing', '5'],
        ['Admin key and rate limiting', '9'],
        ['Club ids', '3'],
        ['Streaming parser in the web app', '6']
      ]
    },
    challenges: [
      'Hybrid search without a hosted keyword model: keyword vectors are built in the app from hashed, weighted terms.',
      'Re-indexing only embeds new text: each vector’s id is a hash of its chunk, so unchanged chunks are never embedded twice.',
      'When nothing relevant is found, the model replies with a hidden marker that is never streamed and becomes an honest “I don’t have information”.',
      'A public demo needs guards: an admin key on every endpoint that changes data, per-visitor rate limits and an allow-list for the web app.'
    ],
    technologies: ['TypeScript', 'NestJS', 'Retrieval-augmented generation (RAG)', 'Gemini API', 'Gemini embeddings', 'Upstash Vector (hybrid)', 'SQLite (TypeORM)', 'Server-Sent Events', 'Model Context Protocol (MCP)', 'React 19 + Vite', 'Jest and Vitest', 'GitHub Actions', 'Docker', 'Render and Vercel', 'Swagger / OpenAPI'],
    team: { label: 'API built with', members: ['Joseph Amal', 'Aparna'], affiliation: 'Interns at Nanonino' },
    code: null,
    evidence: [],
    learned: null
  }
];

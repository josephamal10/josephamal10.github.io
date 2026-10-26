window.Notebook = window.Notebook || {};

/* ==========================================================================
   ui/ask.js — "Ask this notebook": a visitor types a question about Joseph and
   gets an answer put together from the notebook's own data (Notebook.data),
   with the page to turn to. It runs in the browser: nothing typed is sent
   anywhere, and it never states anything that is not in the data. When a
   question is about something the notebook does not record, it says so and
   points to the contact details instead of guessing.

   Notebook.ask.page(data, ui) → the page: a question card with a wax seal, six guide
                                  cards to start from, and the typed replies
   Notebook.ask.answer(question) → { html: Node, refs: [slug] }   (for tests and reuse)

   How it answers: the question is normalised and matched against topics
   (education, skills, projects, experience, achievements, certificates, contact,
   location, roles, languages, soft skills, about). Named things (a skill, a
   project, a certificate subject) win over general topics. Each topic's answer
   is written from the data at the moment of asking.
   ========================================================================== */
(function (N) {
  'use strict';

  var h = N.h;
  var D = function () { return N.data || {}; };
  function present(v) { return N.ui && N.ui.present ? N.ui.present(v) : !!v; }

  /* ------------------------------------------------------------ text helpers */

  function norm(s) {
    return ' ' + String(s || '').toLowerCase()
      .replace(/[’']/g, '')
      .replace(/c\+\+/g, ' cplusplus ')
      .replace(/m\.sc\.?|msc/g, ' msc ')
      .replace(/[^a-z0-9#\s]/g, ' ')
      .replace(/\s+/g, ' ').trim() + ' ';
  }
  function has(q, word) { return q.indexOf(' ' + word + ' ') >= 0; }
  function hasAny(q, words) { for (var i = 0; i < words.length; i++) if (has(q, words[i])) return true; return false; }
  function count(q, words) { var n = 0; for (var i = 0; i < words.length; i++) if (has(q, words[i])) n += words[i].split(' ').length; return n; }

  function joinList(items, last) {
    items = items.filter(present);
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + (last || ' and ') + items[items.length - 1];
  }

  function page(slug) {
    if (!N.book || typeof N.book.resolve !== 'function') return null;
    return N.book.resolve(slug);
  }
  function ref(slug, text) {
    var p = page(slug);
    if (!p) return null;
    return h('a', { class: 'page-ref ask__ref', href: N.router ? N.router.href(p.slug) : '#/' + p.slug },
      (text ? text + ' ' : 'See ') + 'p. ' + p.number);
  }
  function para() { return h('p', null, [].slice.call(arguments)); }

  /* ------------------------------------------------------------ what the notebook knows */

  function profile() { return D().profile || {}; }
  // 'Aspiring AI / ML engineer' → 'an aspiring AI / ML engineer' (a capital that only starts the line is lowered)
  function article(t) {
    t = /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
    return (/^[aeiou]/i.test(t) ? 'an ' : 'a ') + t;
  }
  // Answers name him rather than guess pronouns: 'Joseph', 'Joseph’s'.
  function who() { var pr = profile(); return String(pr.shortName || pr.name || '').split(' ')[0] || 'the owner'; }
  function whose() { return who() + '’s'; }
  function projects() { return (D().projects || []).filter(function (p) { return p && p.id; }); }
  function skillGroups() { return ((D().skills || {}).groups || []); }
  function certGroups() { return ((D().certificates || {}).groups || []); }

  // Every skill the notebook names, with the words a visitor might use for it.
  var SKILL_WORDS = {
    'Python': ['python'], 'Java': ['java'], 'C++': ['cplusplus', 'cpp'], 'SQL': ['sql', 'mysql', 'database', 'databases'],
    'NoSQL': ['nosql', 'no sql', 'mongodb'], 'HTML': ['html'], 'CSS': ['css'], 'JavaScript': ['javascript', 'js'],
    'Artificial Intelligence': ['ai', 'artificial intelligence'], 'Machine Learning': ['ml', 'machine learning'],
    'Android Development': ['android', 'mobile app', 'mobile apps', 'mobile development'],
    'Data Structures & Algorithms': ['dsa', 'data structures', 'algorithms', 'data structure'],
    'Flask': ['flask'], 'Blynk Cloud Platform': ['blynk'], 'IoT Sensors & Communication Protocols': ['iot', 'sensors', 'internet of things'],
    'Git/GitHub': ['git', 'github'], 'Google Colab': ['colab', 'google colab'], 'Jupyter': ['jupyter'], 'Cursor': ['cursor'],
    'PyTorch': ['pytorch', 'torch'], 'CNN-LSTM architectures': ['cnn', 'lstm', 'bilstm', 'cnn lstm'],
    'Model fine-tuning': ['fine tuning', 'finetuning', 'fine tune', 'domain adaptation'],
    'Class-imbalance handling (weighted sampling)': ['class imbalance', 'imbalanced', 'weighted sampling'],
    'Evaluation metrics (EER, precision, recall)': ['eer', 'equal error rate', 'precision', 'recall', 'evaluation metrics'],
    'Librosa': ['librosa'], 'Torchaudio': ['torchaudio'], 'Audio feature extraction': ['audio features', 'feature extraction', 'mfcc', 'mfccs'],
    'Voice anti-spoofing and deepfake detection': ['anti spoofing', 'antispoofing', 'spoofing', 'deepfake', 'deepfakes', 'deep fake'],
    'ASVspoof 2019': ['asvspoof'], 'ElevenLabs (generating test data)': ['elevenlabs', 'eleven labs'],
    'Retrieval-augmented generation (RAG)': ['rag', 'retrieval augmented'], 'Embeddings (Jina, Gemini)': ['embeddings', 'embedding', 'jina'],
    'Vector databases (Pinecone, Upstash)': ['vector database', 'vector databases', 'vector db', 'pinecone'],
    'Gemini API': ['gemini'], 'Claude API': ['claude', 'anthropic'], 'Multi-provider LLM abstraction': ['multi provider', 'llm abstraction'],
    'Prompt engineering': ['prompt engineering', 'prompting'],
    'FastAPI': ['fastapi', 'fast api'], 'REST APIs': ['rest api', 'rest apis', 'restful'], 'Streamlit': ['streamlit'],
    'TypeScript': ['typescript', 'ts'], 'NestJS': ['nestjs', 'nest js', 'nest'], 'PostgreSQL': ['postgres', 'postgresql'],
    'Hybrid search (Upstash Vector)': ['hybrid search', 'upstash'], 'Model Context Protocol (MCP)': ['mcp', 'model context protocol'],
    'TensorFlow': ['tensorflow', 'keras'], 'Hugging Face Transformers': ['hugging face', 'huggingface', 'transformers'],
    'Speech-to-text (Whisper)': ['whisper', 'speech to text', 'speech recognition', 'asr'], 'wav2vec2 speech models': ['wav2vec', 'wav2vec2'],
    'LangChain': ['langchain', 'lang chain'], 'Reranking': ['reranking', 'reranker', 're ranking'],
    'LLM evaluation and guardrails': ['llm evaluation', 'evals', 'guardrails', 'evaluation'],
    'NumPy': ['numpy'], 'Pandas': ['pandas'], 'scikit-learn': ['scikit', 'sklearn', 'scikit learn'],
    'Docker': ['docker', 'containers'], 'GitHub Actions (CI)': ['github actions', 'ci cd', 'cicd', 'continuous integration'],
    'pytest': ['pytest', 'unit tests', 'unit testing'], 'Jest and Vitest': ['jest', 'vitest'],
    'React': ['react', 'reactjs', 'react js'], 'Flutter': ['flutter', 'dart'],
    'OpenCV': ['opencv', 'open cv', 'computer vision', 'image processing'], 'MediaPipe': ['mediapipe', 'media pipe', 'face landmarks'],
    'Face detection and recognition (YuNet, SFace)': ['face recognition', 'face detection', 'facial recognition', 'yunet', 'sface'],
    'Face anti-spoofing and liveness': ['liveness', 'face spoofing', 'presentation attack', 'blink detection'], 'SQLite': ['sqlite'], 'Streaming responses (Server-Sent Events)': ['streaming', 'server sent events', 'sse'],
    'Query routing and follow-up rewriting': ['query routing', 'query rewriting', 'follow up questions'],
    'Cloud deployment (Modal, Render, Vercel)': ['deployment', 'deploy', 'render', 'vercel', 'modal'], 'ONNX Runtime': ['onnx', 'quantization', 'quantisation']
  };
  // Things a visitor might ask about that are not in the notebook: answered honestly.
  var OTHER_TECH = ['angular', 'vue', 'nodejs', 'django', 'aws', 'azure', 'gcp', 'kubernetes',
    'php', 'ruby', 'golang', 'rust', 'kotlin', 'swift', 'excel', 'power bi',
    'tableau', 'figma', 'linux', 'dotnet', 'scala', 'matlab', 'photoshop'];

  function projectWords(p) {
    var extra = {
      'confident-talk-analyzer': ['confident', 'speech', 'voice', 'analyzer', 'analyser', 'confidence'],
      'automatic-garage': ['garage', 'blynk', 'iot', 'servo', 'smart garage', 'door'],
      'defi-presentation': ['blockchain', 'defi', 'decentralized', 'decentralised', 'finance', 'smart contracts', 'ethereum', 'crypto'],
      'smart-attendance-kiosk': ['attendance', 'kiosk', 'face recognition', 'facial recognition', 'check in', 'check-in', 'anti spoofing face', 'liveness', 'flutter'],
      'rag-knowledge-base-api': ['knowledge base', 'nestjs', 'upstash', 'mcp', 'hybrid search', 'voice bot', 'knowledge base api', 'aparna', 'react', 'streaming', 'chat app'],
      'rag-golf-assistant': ['caddieai', 'caddie', 'rag', 'golf', 'golfer', 'golfers', 'courserev', 'retrieval', 'chatbot', 'question answering', 'assistant', 'pinecone', 'jina'],
      'synthetic-voice-detection': ['synthetic', 'synthetic voice', 'voice detection', 'deepfake', 'deepfakes', 'deep fake', 'cloned voice',
        'voice cloning', 'anti spoofing', 'spoofing', 'asvspoof', 'fake voice', 'ai voice']
    };
    return extra[p.id] || norm(p.title).trim().split(' ').filter(function (w) { return w.length > 4; });
  }

  /* ------------------------------------------------------------ answers */

  function aboutAnswer() {
    var pr = profile();
    var s = pr.seeking || {};
    return [
      para(pr.name + ' is ' + (pr.headline ? article(pr.headline) : 'a student') +
        (pr.headlineDetail ? ' (' + pr.headlineDetail + ')' : '') + (pr.location ? ', based in ' + pr.location : '') + '.'),
      (pr.summary || []).length ? para(pr.summary.join(' ')) : null,
      (s.roles || []).length ? para(who() + ' is looking for work as a ' + joinList(s.roles, ' or ') + '.', ' ', ref('about')) : null
    ];
  }

  function educationAnswer(q) {
    var eds = (D().education || []).filter(Boolean);
    if (!eds.length) return null;
    var out = eds.map(function (e) {
      var bits = [e.qualification + (e.detail ? ' (' + e.detail + ')' : '')];
      if (e.institution) bits.push('at ' + e.institution + (e.university ? ', ' + e.university : ''));
      if (e.period && e.period.label) bits.push(e.period.label);
      if (e.score && e.score.value) bits.push((e.score.label || 'Grade') + ' ' + e.score.value);
      if (e.stage) bits.push(e.stage);
      return h('li', null, bits.join(' · '));
    });
    var lead = whose() + ' education:';
    if (hasAny(q, ['gpa', 'cgpa', 'grade', 'grades', 'marks', 'score', 'percentage'])) {
      var scores = eds.filter(function (e) { return e.score && e.score.value; }).map(function (e) {
        return (e.score.label ? e.score.label + ' ' : '') + e.score.value + ' in the ' + e.qualification + (e.period && /ongoing/i.test(e.period.label || '') ? ' so far' : '');
      });
      if (scores.length) lead = whose() + ' grades: ' + joinList(scores) + '.';
    }
    return [para(lead), h('ul', { class: 'list' }, out), para(ref('education'))];
  }

  function skillsAnswer() {
    var sk = D().skills || {};
    var groups = skillGroups().map(function (g) { return h('li', null, h('b', null, g.label + ': '), (g.items || []).join(', ')); });
    return [
      para(whose() + ' skills, as listed in the index:'),
      h('ul', { class: 'list' }, groups),
      (sk.soft || []).length ? para('Soft skills: ' + sk.soft.join(', ') + '.') : null,
      para(ref('skills'))
    ];
  }

  function oneSkillAnswer(name) {
    var sk = D().skills || {};
    var group = null;
    skillGroups().forEach(function (g) { if ((g.items || []).indexOf(name) >= 0) group = g.label; });
    var used = ((sk.usedIn || {})[name] || []).map(function (id) {
      var p = projects().filter(function (x) { return x.id === id; })[0];
      return p ? p.title : null;
    }).filter(Boolean);
    var studied = (sk.studied || []).filter(function (s) { return norm(s.label).indexOf(' ' + norm(name).trim().split(' ')[0] + ' ') >= 0; });
    // acronyms such as "LLM" and "GenAI" keep their capitals
    var groupName = group ? group.split(' ').map(function (w) { return /[A-Z].*[A-Z]/.test(w) ? w : w.toLowerCase(); }).join(' ') : null;
    var out = [para('Yes. ' + name + ' is listed in ' + whose() + ' skills' + (groupName ? ' under ' + groupName : '') + '.')];
    if (used.length) out.push(para(who() + ' used it in ' + joinList(used) + '.'));
    studied.forEach(function (s) { out.push(para(who() + ' also studied ' + s.label.toLowerCase() + ' through certification (' + s.source + '), ' + (s.certificates || []).length + ' certificates.')); });
    out.push(para(ref('skills')));
    return out;
  }

  function notListedAnswer(word) {
    var c = (profile().contact || {});
    return [
      para('“' + word + '” is not written anywhere in this notebook, so I can’t say whether ' + who() + ' knows it.'),
      para('What ' + who() + ' does list: ' + skillGroups().map(function (g) { return (g.items || []).join(', '); }).join('; ') + '.'),
      c.email ? para('You could ask ' + who() + ' directly: ', h('a', { href: 'mailto:' + c.email }, c.email), '.') : null
    ];
  }

  function projectsAnswer() {
    var items = projects().map(function (p) {
      return h('li', null, h('b', null, 'P-' + p.number + ' ' + p.title), p.period && p.period.label ? ' (' + p.period.label + ')' : '', ' — ' + (p.summary || ''), ' ', ref('projects/' + p.id, ''));
    });
    return [para('The projects in this notebook:'), h('ul', { class: 'list' }, items)];
  }

  function oneProjectAnswer(p) {
    var out = [para(h('b', null, p.title), ' — ' + [p.kind, p.period && p.period.label].filter(present).join(', ') + '.')];
    if (p.summary) out.push(para(p.summary));
    var steps = (p.howItWorks || []).filter(present);
    if (steps.length) out.push(para('How it works: ' + steps.join(' ')));
    if ((p.technologies || []).length) out.push(para('Technologies: ' + p.technologies.join(', ') + '.'));
    if (p.paper && p.paper.event) out.push(para('Presented as a paper at the ' + p.paper.event + ', ' + (p.paper.date && p.paper.date.label || '') + '.'));
    if (p.team && (p.team.members || []).length > 1) out.push(para((p.team.label || 'Team') + ': ' + p.team.members.join(', ') + '.'));
    out.push(para(ref('projects/' + p.id)));
    return out;
  }

  function experienceAnswer() {
    var xs = (D().experience || []).filter(Boolean);
    if (!xs.length) return null;
    var out = [];
    xs.forEach(function (e) {
      out.push(para(h('b', null, e.organization), ' — ' + [e.role, e.period && e.period.label].filter(present).join(', ') + '.'));
      if (e.engagement) out.push(para(e.engagement));
      if (e.summary) out.push(para(e.summary));
      (e.points || []).forEach(function (pt) { out.push(para(pt)); });
    });
    out.push(para(ref('experience')));
    return out;
  }

  function achievementsAnswer() {
    var rs = (D().recognition || []).filter(Boolean);
    if (!rs.length) return null;
    return [
      para(whose() + ' achievements and roles:'),
      h('ul', { class: 'list' }, rs.map(function (r) {
        return h('li', null, h('b', null, r.title), r.date && r.date.label ? ' (' + r.date.label + ')' : '', ' — ' + (r.detail || ''));
      })),
      para(ref('achievements'))
    ];
  }

  function certificatesAnswer(q) {
    var groups = certGroups();
    var total = 0;
    var rows = groups.map(function (g) {
      var items = (g.items || []).filter(function (it) { return it && present(it.title); });
      total += items.length;
      return h('li', null, h('b', null, g.label + ' (' + items.length + '): '), items.map(function (it) { return it.title; }).join('; '));
    });
    var out = [para(who() + ' keeps ' + total + ' certificates in this notebook:'), h('ul', { class: 'list' }, rows)];
    var note = (D().certificates || {}).note;
    if (note && hasAny(q, ['coursera', 'name', 'verify', 'verified'])) out.push(para(note));
    out.push(para('Each one opens as a document on the certificates pages. ', ref('certificates')));
    return out;
  }

  function contactAnswer(q) {
    var pr = profile();
    var c = pr.contact || {};
    var rows = [];
    if (c.resume && c.resume.href && hasAny(q || '', ['resume', 'cv'])) {
      return [para('Yes, ' + whose() + ' résumé is here: ', h('a', { href: c.resume.href, download: c.resume.file || '' }, 'Download (PDF)'), '.'),
        para('Or get in touch directly: ', c.email ? h('a', { href: 'mailto:' + c.email }, c.email) : null, ' ', ref('contact', 'Contact page,'))];
    }
    if (c.email) rows.push(h('li', null, 'Email: ', h('a', { href: 'mailto:' + c.email }, c.email)));
    if (c.phone && c.phone.display) rows.push(h('li', null, 'Phone: ', c.phone.tel ? h('a', { href: 'tel:' + c.phone.tel }, c.phone.display) : c.phone.display));
    if (c.linkedin && c.linkedin.url) rows.push(h('li', null, 'LinkedIn: ', N.ui.link(c.linkedin.url, c.linkedin.label || c.linkedin.url, { external: true })));
    if (c.resume && c.resume.href) rows.push(h('li', null, h('a', { href: c.resume.href, download: c.resume.file || '' }, 'Download ' + whose() + ' résumé (PDF)')));
    return [para('You can reach ' + who() + ' here:'), h('ul', { class: 'list' }, rows), para(ref('contact', 'Contact page,'))];
  }

  function locationAnswer(q) {
    var pr = profile();
    if (!present(pr.location)) return null;
    var out = [para(who() + ' is based in ' + pr.location + '.')];
    if (hasAny(q, ['relocate', 'relocation', 'move', 'remote', 'onsite', 'hybrid', 'travel'])) {
      out.push(para('The notebook doesn’t say whether ' + who() + ' would relocate or work remotely; that is best asked directly. ', ref('contact', 'Contact:')));
    }
    return out;
  }

  function rolesAnswer(q) {
    var pr = profile();
    var s = pr.seeking || {};
    var out = [para(who() + ' is seeking opportunities as a ' + joinList(s.roles || [], ' or ') + '.')];
    if (s.aim) out.push(para(s.aim));
    var e = (D().education || [])[0];
    if (hasAny(q, ['when', 'available', 'availability', 'graduate', 'graduation', 'start', 'join', 'notice'])) {
      out.push(para(who() + ' is ' + (pr.headline ? article(pr.headline) : 'a student') + (e && e.period ? ' (' + e.period.label + (e.stage ? ', ' + e.stage : '') + ')' : '') + '. The notebook doesn’t give a start date, so please ask ' + who() + '. ', ref('contact', 'Contact:')));
    }
    return out;
  }

  function languagesAnswer() {
    var ls = (profile().languages || []).filter(Boolean);
    return [para(who() + ' speaks ' + joinList(ls.map(function (l) { return l.name + ' (' + String(l.level || '').toLowerCase() + ')'; })) + '.'), para(ref('education'))];
  }

  function softAnswer() {
    var sk = D().skills || {};
    var coord = (D().recognition || []).filter(function (r) { return /coordinator/i.test(r.title || ''); })[0];
    return [
      para('Soft skills ' + who() + ' lists: ' + (sk.soft || []).join(', ') + '.'),
      coord ? para(coord.title + (coord.detail ? ': ' + coord.detail : '') + ' ', ref('achievements')) : null
    ];
  }

  function greetingAnswer() {
    return [para('Hello! Ask me anything about ' + who() + ': projects, skills, education, experience, certificates or how to get in touch.')];
  }
  function thanksAnswer() { return [para('You’re welcome. If you’d like to talk to ' + who() + ', the contact details are on the page opposite.')]; }

  function fallbackAnswer() {
    var c = (profile().contact || {});
    return [
      para('I couldn’t find that in this notebook. I can answer about ' + whose() + ' projects, skills, education, experience, achievements, certificates, location, the roles ' + who() + ' is seeking, and how to get in touch.'),
      c.email ? para('For anything else, ask ' + who() + ' directly: ', h('a', { href: 'mailto:' + c.email }, c.email), '.') : null
    ];
  }

  /* ------------------------------------------------------------ choosing the answer */

  var TOPICS = [
    { id: 'education', words: ['education', 'study', 'studies', 'studying', 'degree', 'college', 'university', 'msc', 'masters', 'master', 'qualification', 'qualifications', 'gpa', 'cgpa', 'grade', 'grades', 'marks', 'school', 'hsc', '12th', 'percentage', 'academic', 'academics', 'course of study', 'student'], fn: educationAnswer },
    { id: 'skills', words: ['skill', 'skills', 'tech stack', 'stack', 'technologies', 'technology', 'tools', 'programming', 'programming languages', 'coding', 'good at', 'expertise', 'proficient'], fn: skillsAnswer },
    { id: 'projects', words: ['project', 'projects', 'built', 'build', 'made', 'developed', 'worked on', 'portfolio', 'work samples'], fn: projectsAnswer },
    { id: 'experience', words: ['experience', 'experiences', 'work experience', 'job', 'jobs', 'intern', 'internship', 'company', 'companies', 'employer', 'employed', 'working', 'industry', 'nanonino', 'currently', 'current'], fn: experienceAnswer },
    { id: 'achievements', words: ['achievement', 'achievements', 'award', 'awards', 'prize', 'prizes', 'won', 'win', 'winner', 'hackathon', 'hackathons', 'sih', 'smart india', 'conference', 'icac', 'publication', 'published', 'recognition', 'recognised', 'recognized', 'coordinator', 'entrepreneur', 'foundera', 'accomplishments'], fn: achievementsAnswer },
    { id: 'certificates', words: ['certificate', 'certificates', 'certification', 'certifications', 'certified', 'course', 'courses', 'coursera', 'vanderbilt', 'michigan', 'credential', 'credentials', 'specialization', 'specializations', 'prompt engineering', 'generative ai', 'genai', 'chatgpt'], fn: certificatesAnswer },
    { id: 'contact', words: ['contact', 'email', 'mail', 'e mail', 'phone', 'number', 'call', 'reach', 'linkedin', 'connect', 'message', 'hire', 'hiring', 'interview', 'resume', 'cv', 'get in touch'], fn: contactAnswer },
    { id: 'location', words: ['where', 'location', 'located', 'live', 'lives', 'based', 'city', 'relocate', 'relocation', 'remote', 'onsite', 'hometown'], fn: locationAnswer },
    { id: 'roles', words: ['role', 'roles', 'position', 'positions', 'looking', 'seeking', 'open to', 'available', 'availability', 'opportunity', 'opportunities', 'fresher', 'graduate', 'graduation', 'career', 'goal', 'goals', 'aim', 'join'], fn: rolesAnswer },
    { id: 'languages', words: ['speak', 'speaks', 'spoken', 'english', 'tamil', 'french', 'mother tongue', 'languages does he speak'], fn: languagesAnswer },
    { id: 'soft', words: ['soft skills', 'soft skill', 'teamwork', 'leadership', 'communication', 'time management', 'critical thinking', 'adaptability', 'problem solving', 'strengths', 'strength', 'personality'], fn: softAnswer },
    { id: 'about', words: ['who', 'about', 'yourself', 'himself', 'introduce', 'introduction', 'summary', 'background', 'profile', 'tell me'], fn: aboutAnswer }
  ];

  function answer(question) {
    var q = norm(question);
    if (!q.trim()) return null;

    // greetings and thanks, when that is all the message is
    if (/^ (hi|hello|hey|hai|good (morning|afternoon|evening))( there)? $/.test(q)) return greetingAnswer();
    if (/^ (thanks|thank you|thankyou|ok thanks|great thanks|cheers) $/.test(q)) return thanksAnswer();

    // a named project wins
    var best = null, bestN = 0;
    projects().forEach(function (p) {
      var n = count(q, projectWords(p));
      if (n > bestN) { best = p; bestN = n; }
    });
    if (best && bestN > 0 && !hasAny(q, ['projects'])) return oneProjectAnswer(best);

    // a named skill wins over the general topics ("does Joseph know python", "python projects")
    var skills = Object.keys(SKILL_WORDS).filter(function (name) {
      var inData = skillGroups().some(function (g) { return (g.items || []).indexOf(name) >= 0; });
      return inData && hasAny(q, SKILL_WORDS[name]);
    });
    var programmingLangQ = hasAny(q, ['programming languages', 'languages does he code', 'coding languages']);
    if (skills.length === 1 && !programmingLangQ) return oneSkillAnswer(skills[0]);
    if (skills.length > 1) return [].concat.apply([], skills.map(oneSkillAnswer));

    // a technology the notebook does not mention: say so, do not guess
    var other = OTHER_TECH.filter(function (w) { return has(q, w); })[0];
    if (other && hasAny(q, ['know', 'knows', 'use', 'used', 'experience', 'worked', 'skill', 'skills', 'familiar', 'does', 'can'])) return notListedAnswer(other);

    // "languages" alone means spoken languages unless programming is mentioned
    if (programmingLangQ || (has(q, 'languages') && hasAny(q, ['programming', 'code', 'coding']))) return skillsAnswer();

    // a named soft skill ("is he good at teamwork") is about the soft skills, not the skills index
    var softWords = ((D().skills || {}).soft || []).map(function (x) { return norm(x).trim(); })
      .concat(TOPICS.filter(function (t) { return t.id === 'soft'; })[0].words);
    if (hasAny(q, softWords)) return softAnswer();

    // the best general topic
    var top = null, topN = 0;
    TOPICS.forEach(function (t) {
      var n = count(q, t.words);
      if (n > topN) { top = t; topN = n; }
    });
    if (top) return top.fn(q) || fallbackAnswer();
    return fallbackAnswer();
  }

  /* ------------------------------------------------------------ the page

     The page is a small correspondence desk inside the notebook: the visitor writes a
     question in pen on an index card and presses the wax seal; the reply comes back as a
     typed slip taped into the notebook, typed out a character at a time, with the pages
     to turn to stamped on it. Six guide cards offer questions to start with. */

  var MAX_REPLIES = 4;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function reduced() { return !!(N.motion && N.motion.reduced && N.motion.reduced()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  function suggestions() {
    var n = who();
    var org = ((D().experience || []).filter(function (e) { return e && present(e.organization); })[0] || {}).organization;
    return [
      { topic: 'Projects', q: 'What has ' + n + ' built?' },
      { topic: 'Skills', q: 'Does ' + n + ' know Python?' },
      { topic: 'Education', q: 'Where does ' + n + ' study?' },
      org ? { topic: 'Experience', q: 'What did ' + n + ' do at ' + org + '?' } : null,
      (D().recognition || []).length ? { topic: 'Achievements', q: 'Any awards?' } : null,
      { topic: 'Contact', q: 'How can I get in touch?' }
    ].filter(Boolean);
  }

  // A fountain-pen nib (after Lucide's "pen-tool", ISC licence).
  function nib() {
    var s = N.svg;
    return s('svg', { class: 'ask__nib', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' },
      s('path', { d: 'M15.7 21.3a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4l5.6-5.6a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4z' }),
      s('path', { d: 'm18 13-1.4-6.9a1 1 0 0 0-.7-.8L3.2 2a1 1 0 0 0-1.2 1.2l3.3 12.7a1 1 0 0 0 .8.7L13 18' }),
      s('path', { d: 'm2.3 2.3 7.3 7.3' }),
      s('circle', { cx: '11', cy: '11', r: '2' }));
  }

  function dots() {
    return h('span', { class: 'ask__dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
  }

  // Types a reply out like a typewriter: the text a character at a time, each page
  // reference stamped on as it is reached. Returns a function that finishes at once.
  function typeOut(box, done) {
    var units = [], total = 0;
    (function collect(node) {
      for (var c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { if (c.nodeValue) units.push({ text: c, full: c.nodeValue }); }
        else if (c.nodeType === 1) {
          if (c.classList.contains('ask__ref')) units.push({ stamp: c });
          else collect(c);
        }
      }
    })(box);
    units.forEach(function (u) {
      u.from = total;
      total += u.stamp ? 8 : u.full.length;
      if (u.text) u.text.nodeValue = ''; else u.stamp.classList.add('is-waiting');
    });
    var caret = h('span', { class: 'ask__caret', 'aria-hidden': 'true' });
    var ms = Math.max(500, Math.min(2000, total * 12));
    var start = null, finished = false;

    function show(n) {
      var at = null;
      units.forEach(function (u) {
        if (u.text) {
          var k = Math.max(0, Math.min(u.full.length, n - u.from));
          if (u.text.nodeValue.length !== k) u.text.nodeValue = u.full.slice(0, k);
          if (k > 0 && k < u.full.length) at = u.text;
        } else if (n >= u.from && u.stamp.classList.contains('is-waiting')) {
          u.stamp.classList.remove('is-waiting');
          u.stamp.classList.add('is-stamped');
        }
      });
      if (at && caret.previousSibling !== at) at.parentNode.insertBefore(caret, at.nextSibling);
    }
    function finish() {
      if (finished) return;
      finished = true;
      show(Infinity);
      if (caret.parentNode) caret.parentNode.removeChild(caret);
      box.classList.remove('is-typing');
      if (done) done();
    }
    function step(t) {
      if (finished) return;
      if (start === null) start = t;
      var n = Math.floor(total * (t - start) / ms);
      show(n);
      if (n >= total) finish(); else requestAnimationFrame(step);
    }
    box.classList.add('is-typing');
    requestAnimationFrame(step);
    setTimeout(finish, ms + 900);   // requestAnimationFrame stops while the tab is hidden
    return finish;
  }

  function build(data, ui) {
    var name = who();
    var no = 1;
    var current = null;   // finishes the reply that is still being typed
    var writing = null;   // a suggested question being written onto the card

    var root = h('section', { class: 'ask' });
    var noEl = h('span', { class: 'ask__query-no' }, 'No. ' + pad(no));
    var input = h('input', {
      class: 'ask__input', id: ui.uid('ask-q'), type: 'text', maxlength: '200',
      autocomplete: 'off', spellcheck: 'false', placeholder: 'Write your question here…'
    });
    var label = h('label', { class: 'visually-hidden', for: input.id }, 'Your question about ' + name);
    var seal = h('button', { class: 'ask__seal', type: 'submit', 'aria-label': 'Ask the notebook' },
      h('span', { class: 'ask__seal-text', 'aria-hidden': 'true' }, 'Ask'));
    var form = h('form', { class: 'ask__query', role: 'search', novalidate: true },
      h('div', { class: 'ask__query-head', 'aria-hidden': 'true' }, h('span', null, 'Question card'), noEl),
      label,
      h('div', { class: 'ask__line' }, nib(), input),
      seal);
    var errorEl = h('p', { class: 'ask__error', role: 'alert' });
    var picksHead = h('h3', { class: 'ask__picks-head' }, 'Or pull a card from the index');
    var picks = h('ul', { class: 'ask__picks', 'aria-label': 'Suggested questions' },
      suggestions().map(function (s) {
        var b = h('button', { type: 'button', class: 'ask__pick' },
          h('span', { class: 'ask__pick-topic' }, s.topic),
          h('span', { class: 'ask__pick-q' }, s.q));
        b.addEventListener('click', function () { writeThenAsk(s.q); });
        return h('li', { class: 'ask__pick-slot' }, b);
      }));
    var ghost = h('li', { class: 'ask__ghost' },
      h('span', { class: 'ask__ghost-mark', 'aria-hidden': 'true' }, 'Reply'),
      h('span', null, 'The reply is typed here, with the page to turn to.'));
    var log = h('ol', { class: 'ask__log', 'aria-label': 'Replies' }, ghost);
    var live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

    function press() {
      seal.classList.remove('is-pressed');
      void seal.offsetWidth;
      seal.classList.add('is-pressed');
      setTimeout(function () { seal.classList.remove('is-pressed'); }, 260);
    }

    // After asking, the card and the reply under it come into view (layout offsets, so the
    // camera's scale does not skew the scroll).
    function bringIntoView() {
      var body = root.closest ? root.closest('.leaf__body') : null;
      if (!body) return;
      var br = body.getBoundingClientRect(), fr = form.getBoundingClientRect();
      var k = body.offsetHeight ? br.height / body.offsetHeight : 1;
      if (!k) return;
      var top = Math.max(0, body.scrollTop + (fr.top - br.top) / k - 18);
      try { body.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' }); }
      catch (e) { body.scrollTop = top; }
    }

    function ask(text) {
      text = String(text || '').trim();
      if (!text) { errorEl.textContent = 'Write a question on the card first.'; input.focus(); return; }
      errorEl.textContent = '';
      if (current) current();

      var parts = answer(text) || fallbackAnswer();
      var n = no++;
      noEl.textContent = 'No. ' + pad(no);
      input.value = '';
      press();
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      root.classList.add('has-replies');
      picksHead.textContent = 'Ask another';

      var typed = h('div', { class: 'ask__typed' }, parts);
      var plain = typed.textContent.replace(/\s+/g, ' ').trim();
      var turning = h('p', { class: 'ask__turning' }, 'Turning the pages', dots());
      var reply = h('li', { class: 'ask__reply' },
        h('div', { class: 'ask__reply-head' },
          h('span', { class: 'ask__reply-no' }, 'Reply to No. ' + pad(n)),
          h('span', { class: 'ask__reply-stamp', 'aria-hidden': 'true' },
            h('span', { class: 'ask__reply-stamp-word' }, 'Answered'),
            h('span', { class: 'ask__reply-stamp-date' }, today()))),
        h('p', { class: 'ask__asked' }, h('span', { class: 'visually-hidden' }, 'You asked: '), '“' + text + '”'),
        turning);
      log.insertBefore(reply, log.firstChild);
      while (log.children.length > MAX_REPLIES) log.removeChild(log.lastChild);
      bringIntoView();
      live.textContent = '';
      setTimeout(function () { live.textContent = 'Answer: ' + plain; }, 60);

      var calm = reduced(), timer = null, finishTyping = null, done = false;
      function complete() {
        done = true;
        if (current === stop) current = null;
        if (N.eras && N.eras.refresh) N.eras.refresh();
      }
      function begin() {
        timer = null;
        if (turning.parentNode) reply.replaceChild(typed, turning);
        if (calm) complete(); else finishTyping = typeOut(typed, complete);
      }
      function stop() {
        if (done) return;
        if (timer) { clearTimeout(timer); begin(); }
        if (finishTyping) finishTyping();
      }
      current = stop;
      if (calm) begin(); else timer = setTimeout(begin, 600);
      if (N.eras && N.eras.refresh) N.eras.refresh();
    }

    // A card from the index is written onto the question card first, then sent.
    function writeThenAsk(q) {
      if (writing) { clearInterval(writing.id); writing = null; }
      if (reduced()) { ask(q); return; }
      var i = 0;
      input.value = '';
      writing = { q: q, id: setInterval(function () {
        i += 2;
        input.value = q.slice(0, i);
        if (i >= q.length) {
          clearInterval(writing.id);
          writing = null;
          setTimeout(function () { ask(q); }, 180);
        }
      }, 24) };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (writing) { var q = writing.q; clearInterval(writing.id); writing = null; ask(q); return; }
      ask(input.value);
    });
    input.addEventListener('input', function () { if (errorEl.textContent) errorEl.textContent = ''; });

    root.appendChild(ui.pageHeader({ eyebrow: 'Questions', title: 'Ask this notebook' }));
    root.appendChild(h('p', { class: 'ask__intro' },
      'Write a question about ' + name + ' on the card and press the seal. The notebook looks through its own pages and types the reply, with the page to turn to.'));
    [form, errorEl, h('div', { class: 'ask__picks-wrap' }, picksHead, picks), log, live,
      h('p', { class: 'ask__note' }, 'Answered in your browser from the pages of this notebook. Nothing you write is sent anywhere.')]
      .forEach(function (n) { root.appendChild(n); });
    return root;
  }

  N.ask = { page: build, answer: answer };
})(window.Notebook);

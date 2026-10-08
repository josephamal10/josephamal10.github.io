window.Notebook = window.Notebook || {};
Notebook.data = Notebook.data || {};

Notebook.data.experience = [
  {
    id: 'nanonino-academic-project',
    organization: 'Nanonino',
    role: 'Internship',
    engagement: 'A three-month internship, in Year IV of the M.Sc.',
    period: { start: '2026-08', end: '2026-10', label: 'Aug – Oct 2026' },
    summary: 'Project work under the guidance and supervision of the company’s technical team, for practical exposure and industry experience.',
    points: [
      'Built a Synthetic Voice Detection System end to end, as the only developer: a deep learning model (CNN + BiLSTM on MFCC features) that tells a real human voice from an AI-generated or cloned one.',
      'Helped the software team on the courserev.ai project by building CaddieAI, a RAG (retrieval-augmented generation) assistant that answers golf questions and cites its sources.',
      'Built the RAG Knowledge Base API in NestJS with Aparna, a fellow intern: hybrid search over a golf club’s documents, answered through a REST API or as an MCP tool.'
    ],
    projects: ['synthetic-voice-detection', 'rag-golf-assistant', 'rag-knowledge-base-api'],
    project: 'synthetic-voice-detection',
    log: [
      { date: { iso: '2026-08', label: 'Aug 2026' }, text: 'Started a three-month internship with the company, in Year IV of the M.Sc.' },
      { date: { iso: '2026-08', label: 'Aug 2026' }, text: 'Built CaddieAI, a RAG question-answering assistant for golfers, for the courserev.ai project.', project: 'rag-golf-assistant' },
      { date: { iso: '2026-08', label: 'Aug – Sep 2026' }, text: 'Built the Synthetic Voice Detection System end to end, as the only developer.', project: 'synthetic-voice-detection' },
      { date: { iso: '2026-09', label: 'Sep 2026' }, text: 'Built the RAG Knowledge Base API with Aparna, a fellow intern: hybrid search over a golf club’s documents, with an MCP server for a voice bot.', project: 'rag-knowledge-base-api' }
    ],
    technologies: ['Python', 'PyTorch', 'CNN + BiLSTM', 'Librosa', 'Streamlit', 'Retrieval-augmented generation (RAG)', 'Pinecone', 'Gemini API', 'FastAPI', 'NestJS', 'Upstash Vector', 'MCP']
  }
];

Notebook.data.recognition = [
  {
    id: 'icac-2024',
    title: 'Paper presented at ICAC-2024',
    detail: '“Automatic Garage Design using Blynk Cloud Platform”, presented at the International Conference on Advanced Computing, organised by the Department of Computer Science, Bharathiar University, Coimbatore. Six names appear on the certificate.',
    date: { iso: '2024-09-26', label: '26–27 Sep 2024' },
    evidence: 'cert-icac-2024',
    project: 'automatic-garage'
  },
  {
    id: 'atneai-2026',
    title: 'Paper presented at ATNEAI 2026',
    detail: '“Blockchain Technology in Decentralised Finance”, presented at the 13th National Conference, “The Agentic Turn: New Era of Artificial Intelligence”, Sri Krishna Arts and Science College, Coimbatore.',
    date: { iso: '2026-02-24', label: '24 Feb 2026' },
    evidence: 'cert-atneai-2026',
    project: 'defi-presentation'
  },
  {
    id: 'foundera',
    title: 'First Prize, Best Entrepreneur',
    detail: 'Won at the department event “Foundera” for a sustainable RTI government idea.',
    date: null,
    evidence: null,
    project: null
  },
  {
    id: 'sih-2025',
    title: 'Smart India Hackathon (SIH) 2025',
    detail: 'Participated and proposed a solution for tourist safety in the NorthEast region of India: TripZap, from team Optiminds, for problem statement SIH25002 (Smart Tourist Safety Monitoring & Incident Response, using AI, geo-fencing and a blockchain-based digital ID).',
    date: { iso: '2025', label: '2025' },
    evidence: null,
    project: null,
    // The team's idea-submission slides (6 pages), kept in the site
    links: [{ label: 'Our proposal', url: 'assets/docs/sih-2025-tripzap.pdf', kind: 'doc', note: 'TripZap · 6 slides, PDF' }]
  },
  {
    id: 'department',
    title: 'Academic excellence and Event Coordinator',
    detail: 'Recognised for academic excellence, and served as an Event Coordinator of the college department.',
    date: null,
    evidence: null,
    project: null
  }
];

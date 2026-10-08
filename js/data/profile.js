window.Notebook = window.Notebook || {};
Notebook.data = Notebook.data || {};

Notebook.data.profile = {
  name: 'Joseph Amal A.',
  shortName: 'Joseph Amal',

  cover: {
    name: 'JOSEPH AMAL',
    quote: 'Built one page at a time.'
  },

  headline: 'Aspiring AI / ML engineer',
  headlineDetail: 'M.Sc. Software Systems student, 5-year integrated programme',
  location: 'Coimbatore, Tamil Nadu, India',

  photo: {
    src: 'assets/img/joseph-amal.webp',
    alt: 'Portrait of Joseph Amal A. in a dark suit and red tie',
    width: 413,
    height: 531
  },

  // Framed around his aim (AI / ML engineering, Oct 2026); every claim is from the projects in this notebook.
  summary: [
    'Building towards a career as an AI and machine learning engineer.',
    'Builds AI systems end to end and ships them as working apps: a CNN + BiLSTM detector for AI-cloned voices (96.1% accuracy on real-world audio), retrieval-augmented question answering with hybrid search and cited answers, and a speech-coaching app with an LLM coach. Strong foundations in Python, Java and SQL, with hands-on PyTorch, LLM APIs and model evaluation.'
  ],

  seeking: {
    lead: 'Seeking opportunities as a',
    roles: ['AI Engineer', 'ML Engineer', 'Software Developer'],
    aim: 'To apply AI and machine learning to real-world problems and contribute to innovative projects while continuously enhancing expertise.'
  },

  languages: [
    { name: 'English', level: 'Fluent' },
    { name: 'Tamil', level: 'Fluent' },
    { name: 'Malayalam', level: 'Intermediate' },
    { name: 'French', level: 'Basic' }
  ],

  contact: {
    email: 'josephamal2005@gmail.com',
    phone: { display: '+91 94892 28900', tel: '+919489228900' },
    linkedin: {
      url: 'https://www.linkedin.com/in/joseph-amal-69b0092a3',
      label: 'linkedin.com/in/joseph-amal-69b0092a3'
    },
    // The résumé offered for download: one page, LaTeX style (Oct 2026), city only, no street address.
    resume: { href: 'assets/resume/Joseph-Amal-Resume.pdf', label: 'Résumé (PDF)', file: 'Joseph-Amal-Resume.pdf' }
  }
};

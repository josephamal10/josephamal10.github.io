window.Notebook = window.Notebook || {};
Notebook.data = Notebook.data || {};

Notebook.data.skills = {
  groups: [
    {
      id: 'languages',
      label: 'Languages',
      items: ['Python', 'Java', 'C++', 'SQL', 'TypeScript', 'JavaScript']
    },
    {
      id: 'machine-learning',
      label: 'Machine learning',
      items: ['PyTorch', 'TensorFlow', 'Hugging Face Transformers', 'scikit-learn', 'NumPy', 'Pandas', 'Model fine-tuning']
    },
    {
      id: 'computer-vision',
      label: 'Computer vision',
      items: ['OpenCV', 'Face detection and recognition (YuNet, SFace)', 'MediaPipe']
    },
    {
      id: 'llm-genai',
      label: 'LLMs and GenAI',
      items: [
        'Retrieval-augmented generation (RAG)',
        'LangChain',
        'Embeddings (Jina, Gemini)',
        'Vector databases (Pinecone, Upstash)',
        'Reranking',
        'LLM evaluation and guardrails',
        'Model Context Protocol (MCP)',
        'Prompt engineering'
      ]
    },
    {
      id: 'backend-apps',
      label: 'Backend and apps',
      items: ['FastAPI', 'Flask', 'NestJS', 'REST APIs', 'React', 'Flutter', 'PostgreSQL']
    },
    {
      id: 'mlops',
      label: 'MLOps and deployment',
      items: ['Docker', 'GitHub Actions (CI)', 'pytest', 'ONNX Runtime', 'Cloud deployment (Modal, Render, Vercel)']
    }
  ],

  usedIn: {
    'Python': ['confident-talk-analyzer', 'synthetic-voice-detection', 'smart-attendance-kiosk'],
    'PyTorch': ['synthetic-voice-detection', 'smart-attendance-kiosk'],
    'OpenCV': ['smart-attendance-kiosk'],
    'Face detection and recognition (YuNet, SFace)': ['smart-attendance-kiosk'],
    'MediaPipe': ['smart-attendance-kiosk'],
    'Flutter': ['smart-attendance-kiosk'],
    'Model fine-tuning': ['synthetic-voice-detection'],
    'Retrieval-augmented generation (RAG)': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'Reranking': ['rag-golf-assistant'],
    'LLM evaluation and guardrails': ['confident-talk-analyzer', 'rag-golf-assistant'],
    'PostgreSQL': ['confident-talk-analyzer'],
    'NumPy': ['confident-talk-analyzer', 'synthetic-voice-detection'],
    'scikit-learn': ['synthetic-voice-detection'],
    'Docker': ['confident-talk-analyzer', 'rag-golf-assistant', 'rag-knowledge-base-api', 'smart-attendance-kiosk'],
    'GitHub Actions (CI)': ['confident-talk-analyzer', 'rag-golf-assistant', 'rag-knowledge-base-api', 'smart-attendance-kiosk'],
    'pytest': ['confident-talk-analyzer', 'rag-golf-assistant', 'smart-attendance-kiosk'],
    'ONNX Runtime': ['confident-talk-analyzer', 'smart-attendance-kiosk'],
    'TypeScript': ['rag-knowledge-base-api'],
    'NestJS': ['rag-knowledge-base-api'],
    'Model Context Protocol (MCP)': ['rag-knowledge-base-api'],
    'FastAPI': ['rag-golf-assistant', 'smart-attendance-kiosk'],
    'Vector databases (Pinecone, Upstash)': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'Embeddings (Jina, Gemini)': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'React': ['rag-knowledge-base-api'],
    'Cloud deployment (Modal, Render, Vercel)': ['confident-talk-analyzer', 'rag-knowledge-base-api'],
    'REST APIs': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'Flask': ['confident-talk-analyzer'],
    'JavaScript': ['confident-talk-analyzer']
  },

  studied: [
    {
      label: 'Generative AI and prompt engineering',
      source: 'Vanderbilt University, through Coursera',
      certificates: [
        'cert-vu-spec-prompt-educators',
        'cert-vu-spec-genai-assistants',
        'cert-vu-spec-genai-leadership',
        'cert-vu-genai-leaders',
        'cert-vu-gpt-vision',
        'cert-vu-innovative-teaching',
        'cert-vu-trustworthy-genai',
        'cert-vu-openai-gpts',
        'cert-vu-prompt-chatgpt'
      ]
    },
    {
      label: 'Python programming',
      source: 'University of Michigan and Coursera, through Coursera',
      certificates: ['cert-um-python-everybody', 'cert-coursera-intro-python']
    }
  ],

  soft: ['Teamwork', 'Time Management', 'Leadership', 'Effective Communication', 'Critical Thinking', 'Adaptability', 'Problem-Solving']
};

window.Notebook = window.Notebook || {};
Notebook.data = Notebook.data || {};

Notebook.data.skills = {
  groups: [
    {
      id: 'languages-tools',
      label: 'Languages and tools',
      items: ['Python', 'Java', 'C++', 'SQL', 'NoSQL', 'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Git/GitHub', 'Google Colab', 'Jupyter', 'Cursor']
    },
    {
      id: 'deep-learning',
      label: 'Deep learning',
      items: [
        'PyTorch',
        'TensorFlow',
        'Hugging Face Transformers',
        'CNN-LSTM architectures',
        'Model fine-tuning and domain adaptation',
        'Class-imbalance handling (weighted sampling)',
        'Evaluation metrics (EER, precision, recall)'
      ]
    },
    {
      id: 'audio-speech',
      label: 'Audio and speech',
      items: [
        'Speech-to-text (Whisper)',
        'wav2vec2 speech models',
        'Librosa',
        'Torchaudio',
        'Audio feature extraction',
        'Voice anti-spoofing and deepfake detection',
        'ASVspoof 2019',
        'ElevenLabs (generating test data)'
      ]
    },
    {
      id: 'computer-vision',
      label: 'Computer vision',
      items: [
        'OpenCV',
        'Face detection and recognition (YuNet, SFace)',
        'Face anti-spoofing and liveness',
        'MediaPipe'
      ]
    },
    {
      id: 'llm-genai',
      label: 'LLM and GenAI',
      items: [
        'Retrieval-augmented generation (RAG)',
        'LangChain',
        'Embeddings (Jina, Gemini)',
        'Vector databases (Pinecone, Upstash)',
        'Gemini API',
        'Claude API',
        'Multi-provider LLM abstraction',
        'Hybrid search (Upstash Vector)',
        'Model Context Protocol (MCP)',
        'Query routing and follow-up rewriting',
        'Reranking',
        'LLM evaluation and guardrails',
        'Prompt engineering'
      ]
    },
    {
      id: 'backend-apps',
      label: 'Backend and apps',
      items: ['FastAPI', 'NestJS', 'REST APIs', 'Streaming responses (Server-Sent Events)', 'React', 'Flutter', 'PostgreSQL', 'SQLite', 'Streamlit', 'Flask']
    },
    {
      id: 'data-ml',
      label: 'Data and ML libraries',
      items: ['NumPy', 'Pandas', 'scikit-learn']
    },
    {
      id: 'mlops',
      label: 'MLOps and tooling',
      items: ['Docker', 'GitHub Actions (CI)', 'pytest', 'Jest and Vitest', 'Cloud deployment (Modal, Render, Vercel)', 'ONNX Runtime (int8 quantization)']
    },
    {
      id: 'technologies',
      label: 'Technologies',
      items: [
        'Artificial Intelligence',
        'Machine Learning',
        'Android Development',
        'Data Structures & Algorithms',
        'Blynk Cloud Platform',
        'IoT Sensors & Communication Protocols'
      ]
    }
  ],

  usedIn: {
    'Python': ['confident-talk-analyzer', 'synthetic-voice-detection', 'smart-attendance-kiosk'],
    'Google Colab': ['synthetic-voice-detection'],
    'PyTorch': ['synthetic-voice-detection', 'smart-attendance-kiosk'],
    'OpenCV': ['smart-attendance-kiosk'],
    'Face detection and recognition (YuNet, SFace)': ['smart-attendance-kiosk'],
    'Face anti-spoofing and liveness': ['smart-attendance-kiosk'],
    'MediaPipe': ['smart-attendance-kiosk'],
    'Flutter': ['smart-attendance-kiosk'],
    'CNN-LSTM architectures': ['synthetic-voice-detection'],
    'Model fine-tuning and domain adaptation': ['synthetic-voice-detection'],
    'Class-imbalance handling (weighted sampling)': ['synthetic-voice-detection'],
    'Evaluation metrics (EER, precision, recall)': ['synthetic-voice-detection'],
    'Librosa': ['synthetic-voice-detection'],
    'Audio feature extraction': ['synthetic-voice-detection'],
    'Voice anti-spoofing and deepfake detection': ['synthetic-voice-detection'],
    'ASVspoof 2019': ['synthetic-voice-detection'],
    'Retrieval-augmented generation (RAG)': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'Speech-to-text (Whisper)': ['confident-talk-analyzer'],
    'wav2vec2 speech models': ['confident-talk-analyzer'],
    'Reranking': ['rag-golf-assistant'],
    'LLM evaluation and guardrails': ['confident-talk-analyzer', 'rag-golf-assistant'],
    'PostgreSQL': ['confident-talk-analyzer'],
    'NumPy': ['confident-talk-analyzer', 'synthetic-voice-detection'],
    'scikit-learn': ['synthetic-voice-detection'],
    'Docker': ['confident-talk-analyzer', 'rag-golf-assistant', 'rag-knowledge-base-api', 'smart-attendance-kiosk'],
    'GitHub Actions (CI)': ['confident-talk-analyzer', 'rag-golf-assistant', 'rag-knowledge-base-api', 'smart-attendance-kiosk'],
    'pytest': ['confident-talk-analyzer', 'rag-golf-assistant', 'smart-attendance-kiosk'],
    'ONNX Runtime (int8 quantization)': ['confident-talk-analyzer', 'smart-attendance-kiosk'],
    'TypeScript': ['rag-knowledge-base-api'],
    'NestJS': ['rag-knowledge-base-api'],
    'Hybrid search (Upstash Vector)': ['rag-knowledge-base-api'],
    'Model Context Protocol (MCP)': ['rag-knowledge-base-api'],
    'Gemini API': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'FastAPI': ['rag-golf-assistant', 'smart-attendance-kiosk'],
    'Vector databases (Pinecone, Upstash)': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'Embeddings (Jina, Gemini)': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'Query routing and follow-up rewriting': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'Streaming responses (Server-Sent Events)': ['rag-knowledge-base-api'],
    'React': ['rag-knowledge-base-api'],
    'SQLite': ['confident-talk-analyzer', 'synthetic-voice-detection', 'rag-knowledge-base-api', 'smart-attendance-kiosk'],
    'Jest and Vitest': ['rag-knowledge-base-api'],
    'Cloud deployment (Modal, Render, Vercel)': ['confident-talk-analyzer', 'rag-knowledge-base-api'],
    'REST APIs': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'Streamlit': ['synthetic-voice-detection'],
    'Flask': ['confident-talk-analyzer'],
    'HTML': ['confident-talk-analyzer'],
    'CSS': ['confident-talk-analyzer'],
    'JavaScript': ['confident-talk-analyzer'],
    'Blynk Cloud Platform': ['automatic-garage'],
    'IoT Sensors & Communication Protocols': ['automatic-garage']
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

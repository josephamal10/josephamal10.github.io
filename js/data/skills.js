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
        'Librosa',
        'Torchaudio',
        'Audio feature extraction',
        'Voice anti-spoofing and deepfake detection',
        'ASVspoof 2019',
        'ElevenLabs (generating test data)'
      ]
    },
    {
      id: 'llm-genai',
      label: 'LLM and GenAI',
      items: [
        'Retrieval-augmented generation (RAG)',
        'Embeddings (Jina)',
        'Vector databases (Pinecone)',
        'Gemini API',
        'Claude API',
        'Multi-provider LLM abstraction',
        'Hybrid search (Upstash Vector)',
        'Model Context Protocol (MCP)',
        'Prompt engineering'
      ]
    },
    {
      id: 'backend-apps',
      label: 'Backend and apps',
      items: ['FastAPI', 'NestJS', 'REST APIs', 'Streamlit', 'Flask']
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
    'Python': ['confident-talk-analyzer', 'synthetic-voice-detection'],
    'Google Colab': ['synthetic-voice-detection'],
    'PyTorch': ['synthetic-voice-detection'],
    'CNN-LSTM architectures': ['synthetic-voice-detection'],
    'Model fine-tuning and domain adaptation': ['synthetic-voice-detection'],
    'Class-imbalance handling (weighted sampling)': ['synthetic-voice-detection'],
    'Evaluation metrics (EER, precision, recall)': ['synthetic-voice-detection'],
    'Librosa': ['synthetic-voice-detection'],
    'Audio feature extraction': ['synthetic-voice-detection'],
    'Voice anti-spoofing and deepfake detection': ['synthetic-voice-detection'],
    'ASVspoof 2019': ['synthetic-voice-detection'],
    'Retrieval-augmented generation (RAG)': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'TypeScript': ['rag-knowledge-base-api'],
    'NestJS': ['rag-knowledge-base-api'],
    'Hybrid search (Upstash Vector)': ['rag-knowledge-base-api'],
    'Model Context Protocol (MCP)': ['rag-knowledge-base-api'],
    'Gemini API': ['rag-golf-assistant', 'rag-knowledge-base-api'],
    'FastAPI': ['rag-golf-assistant'],
    'Vector databases (Pinecone)': ['rag-golf-assistant'],
    'Embeddings (Jina)': ['rag-golf-assistant'],
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

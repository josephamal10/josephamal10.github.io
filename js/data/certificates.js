window.Notebook = window.Notebook || {};
Notebook.data = Notebook.data || {};

(function () {
  function asset(id) {
    return {
      image: 'assets/certificates/' + id + '.webp',
      thumb: 'assets/certificates/' + id + '-thumb.webp',
      pdf: 'assets/certificates/pdf/' + id + '.pdf'
    };
  }

  function coursera(id, fields) {
    var files = asset(id);
    return Object.assign({
      id: id,
      platform: 'Coursera',
      nameOnDocument: 'JOSEPHAMAL ANTONY',
      courses: [],
      image: files.image,
      thumb: files.thumb,
      pdf: files.pdf
    }, fields);
  }

  var VU = 'Vanderbilt University';
  var NOV_25 = { iso: '2024-11-25', label: '25 Nov 2024' };

  Notebook.data.certificates = {
    note: 'Coursera certificates are issued in the name JOSEPHAMAL ANTONY.',
    groups: [
      {
        id: 'internship',
        label: 'Internship',
        items: [
          Object.assign({
            id: 'cert-nanonino-internship',
            type: 'Internship certificate',
            title: 'AI Engineer internship',
            issuer: 'Nanonino, Coimbatore',
            platform: null,
            event: 'Three-month internship in the role of AI Engineer',
            date: { iso: '2026-10-23', label: '20 Jul – 23 Oct 2026' },
            verifyUrl: null,
            credentialId: null,
            nameOnDocument: 'JOSEPH AMAL A',
            courses: []
          }, asset('cert-nanonino-internship'))
        ]
      },
      {
        id: 'conference',
        label: 'Conference',
        items: [
          Object.assign({
            id: 'cert-icac-2024',
            type: 'Paper presentation certificate',
            title: 'Automatic Garage Design using Blynk Cloud Platform',
            issuer: 'Department of Computer Science, Bharathiar University',
            platform: null,
            event: 'International Conference on Advanced Computing (ICAC-2024)',
            date: { iso: '2024-09-26', label: '26–27 Sep 2024' },
            verifyUrl: null,
            credentialId: null,
            nameOnDocument: 'A. JOSEPH AMAL',
            courses: [],
            project: 'automatic-garage'
          }, asset('cert-icac-2024')),
          Object.assign({
            id: 'cert-atneai-2026',
            type: 'Certificate of participation',
            title: 'Blockchain Technology in Decentralised Finance',
            issuer: 'Computer Science Stream, Sri Krishna Arts and Science College',
            platform: null,
            event: '13th National Conference, “The Agentic Turn: New Era of Artificial Intelligence” (ATNEAI 2026)',
            date: { iso: '2026-02-24', label: '24 Feb 2026' },
            verifyUrl: null,
            credentialId: null,
            nameOnDocument: 'JOSEPH AMAL A',
            courses: [],
            project: 'defi-presentation'
          }, asset('cert-atneai-2026'))
        ]
      },
      {
        id: 'vanderbilt-specializations',
        label: 'Vanderbilt University · Specializations',
        items: [
          coursera('cert-vu-spec-prompt-educators', {
            type: 'Specialization certificate',
            title: 'Prompt Engineering for Educators',
            issuer: VU,
            date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/specialization/5ZWK234OQUVV',
            credentialId: '5ZWK234OQUVV',
            courses: ['Prompt Engineering for ChatGPT', 'Innovative Teaching with ChatGPT', 'GPT Vision: Seeing the World through Generative AI']
          }),
          coursera('cert-vu-spec-genai-assistants', {
            type: 'Specialization certificate',
            title: 'Generative AI Assistants',
            issuer: VU,
            date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/specialization/BDFID23SQAJF',
            credentialId: 'BDFID23SQAJF',
            courses: ['Prompt Engineering for ChatGPT', 'OpenAI GPTs: Creating Your Own Custom AI Assistants', 'Trustworthy Generative AI']
          }),
          coursera('cert-vu-spec-genai-leadership', {
            type: 'Specialization certificate',
            title: 'Generative AI Leadership & Strategy',
            issuer: VU,
            date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/specialization/SU5G0JBEZ4B6',
            credentialId: 'SU5G0JBEZ4B6',
            courses: ['Generative AI for Leaders', 'Prompt Engineering for ChatGPT', 'Trustworthy Generative AI']
          })
        ]
      },
      {
        id: 'vanderbilt-courses',
        label: 'Vanderbilt University · Courses',
        items: [
          coursera('cert-vu-genai-leaders', {
            type: 'Course certificate', title: 'Generative AI for Leaders', issuer: VU, date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/2V75KHJB7L0Y', credentialId: '2V75KHJB7L0Y'
          }),
          coursera('cert-vu-gpt-vision', {
            type: 'Course certificate', title: 'GPT Vision: Seeing the World through Generative AI', issuer: VU, date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/ICJKNFFX769O', credentialId: 'ICJKNFFX769O'
          }),
          coursera('cert-vu-innovative-teaching', {
            type: 'Course certificate', title: 'Innovative Teaching with ChatGPT', issuer: VU, date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/0DDDUAV9VN0X', credentialId: '0DDDUAV9VN0X'
          }),
          coursera('cert-vu-trustworthy-genai', {
            type: 'Course certificate', title: 'Trustworthy Generative AI', issuer: VU, date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/Y54BUX73I3FM', credentialId: 'Y54BUX73I3FM'
          }),
          coursera('cert-vu-openai-gpts', {
            type: 'Course certificate', title: 'OpenAI GPTs: Creating Your Own Custom AI Assistants', issuer: VU, date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/JTALK4I5PWU9', credentialId: 'JTALK4I5PWU9'
          }),
          coursera('cert-vu-prompt-chatgpt', {
            type: 'Course certificate', title: 'Prompt Engineering for ChatGPT', issuer: VU, date: NOV_25,
            verifyUrl: 'https://coursera.org/verify/KOOIWRNJD3MN', credentialId: 'KOOIWRNJD3MN'
          })
        ]
      },
      {
        id: 'python',
        label: 'Python',
        items: [
          coursera('cert-um-python-everybody', {
            type: 'Course certificate',
            title: 'Programming for Everybody (Getting Started with Python)',
            issuer: 'University of Michigan',
            date: { iso: '2024-06-30', label: '30 Jun 2024' },
            verifyUrl: 'https://coursera.org/verify/R6VHSRKNVLSC',
            credentialId: 'R6VHSRKNVLSC'
          }),
          coursera('cert-coursera-intro-python', {
            type: 'Project certificate',
            title: 'Introduction to Python',
            issuer: 'Coursera',
            date: { iso: '2024-06-17', label: '17 Jun 2024' },
            verifyUrl: 'https://coursera.org/verify/DL66YZMLE6HN',
            credentialId: 'DL66YZMLE6HN'
          })
        ]
      }
    ]
  };
})();

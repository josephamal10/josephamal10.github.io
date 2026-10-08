window.Notebook = window.Notebook || {};
Notebook.data = Notebook.data || {};

Notebook.data.education = [
  {
    id: 'msc-software-systems',
    qualification: 'Master of Software Systems',
    detail: '5-year integrated programme',
    institution: 'Sri Krishna Arts and Science College',
    university: 'Bharathiar University',
    location: 'Coimbatore',
    period: { start: '2023', end: null, label: '2023 – ongoing' },
    // CGPA as Joseph gave and confirmed it (Oct 2026); the Semester V mark sheet shows 7.7 after five semesters
    score: { label: 'CGPA', value: '7.9 / 10' },
    stage: 'Year IV in 2026',
    // From the statements of marks (end-semester examinations). Only grades and credits are shown;
    // the register number, date of birth and photo on the sheets are left out.
    semesters: [
      { sem: 'I', exam: 'Oct/Nov 2023', credits: 22, sgpa: '7.0', cgpa: '7.0' },
      { sem: 'II', exam: 'Apr/May 2024', credits: 24, sgpa: '7.8', cgpa: '7.4' },
      { sem: 'III', exam: 'Oct/Nov 2024', credits: 26, sgpa: '7.3', cgpa: '7.4' },
      { sem: 'IV', exam: 'Apr 2025', credits: 27, sgpa: '8.1', cgpa: '7.6' },
      { sem: 'V', exam: 'Oct/Nov 2025', credits: 27, sgpa: '8.1', cgpa: '7.7' },
      { sem: 'VI', exam: null, credits: null, sgpa: null, cgpa: null, note: 'Mark sheet awaited' }
    ]

  },
  {
    id: 'hsc',
    qualification: 'High School Certificate (HSC)',
    detail: null,
    institution: 'Trinity Matriculation Higher Secondary School',
    university: null,
    location: null,
    period: { start: '2021', end: '2023', label: '2021 – 2023' },
    score: { label: 'Percentage', value: '83%' }
  }
];

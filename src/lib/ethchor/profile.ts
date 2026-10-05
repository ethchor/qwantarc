/**
 * Vimu Kale's portfolio (ethchor.qwantarc.com): everything the page says, in one place.
 */

export const PERSON = {
  name: 'Vimu Kale',
  handle: 'ethchor',
  origin: 'https://ethchor.qwantarc.com',
  role: 'Full stack engineer',
  email: 'vimu@qwantarc.com',
  links: [
    { label: 'GitHub', href: 'https://github.com/ethchor' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vimu-kale-808186191/' },
  ],
};

export interface Work {
  name: string;
  role: string;
  /** One line. */
  summary: string;
  details: string;
  tags: string[];
  healthcare: boolean;
}

export const WORK: Work[] = [
  {
    name: 'Wellpro',
    role: 'Full stack developer',
    summary: 'Healthcare workflow orchestration: clinical and administrative work, end to end, for providers, patients and care teams.',
    details:
      'I architect and build both sides. Modular NestJS APIs move healthcare data in line with FHIR and SMART on FHIR; React components handle complex medical forms, dashboards and real-time care insights; and the platform covers secure patient authentication, scheduling, clinical documentation and care plan generation.',
    tags: ['React', 'NestJS', 'TypeScript', 'Medplum', 'FHIR', 'SMART on FHIR', 'OAuth2'],
    healthcare: true,
  },
  {
    name: 'TodayHealth',
    role: 'Senior full stack engineer',
    summary: 'AI-driven remote patient monitoring, so providers can follow vitals and health metrics as they happen.',
    details:
      'A dashboard for providers with real-time monitoring, predictive analytics for patients whose health is slipping, and automated alerts. It connects to medical devices and to EHR systems.',
    tags: ['React', 'Node.js', 'PostgreSQL', 'AI and ML', 'FHIR'],
    healthcare: true,
  },
  {
    name: 'TailorMed',
    role: 'Healthcare integration specialist',
    summary: 'An Epic integration over FHIR and HL7, connecting a patient assistance platform to the hospital record.',
    details:
      'An integration layer for patient data sync, medication management and clinical workflow automation, built for HIPAA compliance and data security from the first line.',
    tags: ['FHIR', 'HL7', 'Epic APIs', 'SMART on FHIR', 'Medplum', 'Node.js'],
    healthcare: true,
  },
  {
    name: 'Wellity',
    role: 'AI integration lead',
    summary: 'A mental health assistant that offers personal recommendations and tracks mood over time.',
    details:
      'A conversational assistant for mental health support, secure video therapy sessions, and an analytics dashboard where therapists follow each patient’s progress.',
    tags: ['React', 'OpenAI API', 'NestJS', 'MongoDB', 'WebRTC'],
    healthcare: true,
  },
  {
    name: 'BirthModel',
    role: 'ML engineer and full stack developer',
    summary: 'A machine learning model that helps expectant mothers and their doctors plan for childbirth.',
    details:
      'A predictive model trained on historical birth data, a web interface for patients and doctors, and a secure data pipeline so the model keeps improving.',
    tags: ['Python', 'TensorFlow', 'FastAPI', 'React', 'PostgreSQL'],
    healthcare: true,
  },
  {
    name: 'Spectio',
    role: 'Frontend architect',
    summary: 'Business intelligence, together: teams create, share and iterate on reports in real time.',
    details:
      'A real-time collaborative interface for data visualisation, a drag-and-drop report builder, and sharing with fine-grained permissions.',
    tags: ['React', 'Redux Toolkit', 'D3.js', 'WebSocket', 'Material UI'],
    healthcare: false,
  },
  {
    name: 'Crediblock',
    role: 'Full stack developer',
    summary: 'Subscriptions to financial and credit data APIs, in tiers.',
    details: 'Usage-based billing on Stripe, API rate limiting, an analytics dashboard and automated customer onboarding.',
    tags: ['Next.js', 'Stripe', 'PostgreSQL', 'Redis', 'Docker'],
    healthcare: false,
  },
];

/** What I'm building now, at Qwantarc. */
export const NOW = [
  {
    name: 'Qwantarc Interface Guidelines',
    href: 'https://developer.qwantarc.com/design/qig',
    text: 'A design system written for people and for AI agents: every page has a Markdown twin, an llms.txt index and an MCP server that coding agents can query.',
    art: 'arc',
  },
  {
    name: 'Qwantarc Farms',
    href: 'https://farms.qwantarc.com',
    text: 'A plant nursery online, where every plant is drawn by code, leans toward your cursor and follows the sun as you scroll.',
    art: 'plant',
  },
  {
    name: 'The Qwantarc guide',
    href: 'https://qwantarc.com',
    text: 'An AI guide that answers from the guidelines on your own device when it can, falls back to a free cloud model when it can’t, and speaks its answers.',
    art: 'orb',
  },
] as const;

export const EXPERTISE = [
  {
    area: 'Healthcare',
    note: 'Interoperability, clinical workflows and compliance.',
    items: ['FHIR', 'HL7', 'SMART on FHIR', 'Medplum', 'Epic integration', 'EHR systems', 'HIPAA'],
  },
  {
    area: 'Frontend',
    note: 'Interfaces that stay calm under complexity.',
    items: ['React', 'TypeScript', 'Next.js', 'Astro', 'Redux Toolkit', 'Material UI', 'Tailwind CSS', 'GSAP'],
  },
  {
    area: 'Backend',
    note: 'Services and data that scale.',
    items: ['Node.js', 'NestJS', 'Express', 'PostgreSQL', 'MongoDB', 'Redis', 'Cloudflare Workers'],
  },
  {
    area: 'AI and tools',
    note: 'Models where they help, and the tools to ship.',
    items: ['OpenAI API', 'On-device AI', 'MCP', 'Machine learning', 'Docker', 'AWS', 'Jest'],
  },
];

export const WAYS = [
  {
    title: 'Mentoring',
    text: 'I mentor junior developers through code quality, design patterns and career decisions, from their first pull request on.',
  },
  {
    title: 'Pairing and reviews',
    text: 'I pair on the hard problems and review code to share the why, not just to catch bugs.',
  },
  {
    title: 'Sharing what I know',
    text: 'One-to-ones, tech talks and documentation. The best teams are the ones where everyone teaches and everyone learns.',
  },
];

export const TOPICS = ['A project', 'Hiring', 'Mentorship', 'Just saying hello'];

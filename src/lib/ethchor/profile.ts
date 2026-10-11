/**
 * Vimu Kale's portfolio (ethchor.qwantarc.com): everything the page says, in one place.
 *
 * Client and product names stay private. Each case is told by its domain, the work, and the
 * architecture decisions behind it, with a small system diagram: nodes sit on a 420 by 230 grid,
 * and each decision lists the nodes it is about, so hovering it lights them up.
 */

export const PERSON = {
  name: 'Vimu Kale',
  handle: 'ethchor',
  origin: 'https://ethchor.qwantarc.com',
  role: 'Full stack engineer',
  links: [
    { label: 'GitHub', href: 'https://github.com/ethchor' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vimu-kale-808186191/' },
  ],
};

/** Patient-monitor colours: every case gets its own channel. */
export const CHANNELS = {
  ecg: '#3dff9a',
  spo2: '#2ee6ff',
  violet: '#8b6cff',
  bp: '#ff3d8b',
  resp: '#ffd23f',
  temp: '#ff7a3d',
  blue: '#5b8cff',
} as const;

/** Who the software is for, cycled in the hero. */
export const AUDIENCES = ['clinicians', 'patients', 'care teams', 'people who care'];

export interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface Diagram {
  nodes: DiagramNode[];
  /** From, to, and whether data flows both ways. */
  edges: [string, string, boolean?][];
}

export interface Decision {
  title: string;
  text: string;
  /** Diagram nodes this decision is about. */
  nodes: string[];
}

export interface Case {
  slug: string;
  domain: string;
  field: string;
  role: string;
  summary: string;
  did: string;
  decisions: Decision[];
  stack: string[];
  healthcare: boolean;
  color: string;
  diagram: Diagram;
}

export const CASES: Case[] = [
  {
    slug: 'workflow',
    domain: 'Clinical workflow orchestration',
    field: 'Healthcare · Interoperability',
    role: 'Full stack developer',
    summary: 'Clinical and administrative work, end to end, for providers, patients and care teams.',
    did: 'I architected and built both sides: the API that moves clinical data, and the screens care teams work in all day, from scheduling and clinical documentation to care plans and real-time insights.',
    decisions: [
      {
        title: 'FHIR as the data model',
        text: 'Clinical records live as FHIR resources on Medplum rather than in a schema of our own, so the data stays portable and every integration speaks the same language.',
        nodes: ['fhir'],
      },
      {
        title: 'One module per workflow',
        text: 'The NestJS API is split into modules for scheduling, documentation and care plans, each with its own boundaries, so one can change without breaking the others.',
        nodes: ['sched', 'docs', 'plans'],
      },
      {
        title: 'Access through the standard',
        text: 'Patients and clinicians sign in with SMART on FHIR and OAuth2, so permissions follow the standard instead of custom rules.',
        nodes: ['smart'],
      },
      {
        title: 'Forms from components',
        text: 'Complex medical forms are assembled from reusable React components, so each new form builds on the ones before it.',
        nodes: ['patient', 'team'],
      },
    ],
    stack: ['React', 'NestJS', 'TypeScript', 'Medplum', 'FHIR', 'SMART on FHIR', 'OAuth2'],
    healthcare: true,
    color: CHANNELS.ecg,
    diagram: {
      nodes: [
        { id: 'patient', label: 'Patient app', x: 130, y: 30 },
        { id: 'team', label: 'Care team', x: 290, y: 30 },
        { id: 'smart', label: 'SMART on FHIR', x: 210, y: 90 },
        { id: 'sched', label: 'Scheduling', x: 80, y: 150 },
        { id: 'docs', label: 'Documentation', x: 210, y: 150 },
        { id: 'plans', label: 'Care plans', x: 340, y: 150 },
        { id: 'fhir', label: 'Medplum', x: 210, y: 205 },
      ],
      edges: [
        ['patient', 'smart', true],
        ['team', 'smart', true],
        ['smart', 'sched'],
        ['smart', 'docs'],
        ['smart', 'plans'],
        ['sched', 'fhir', true],
        ['docs', 'fhir', true],
        ['plans', 'fhir', true],
      ],
    },
  },
  {
    slug: 'monitoring',
    domain: 'Remote patient monitoring',
    field: 'Healthcare · AI',
    role: 'Senior full stack engineer',
    summary: 'Vitals from medical devices, followed as they happen, with AI that spots who needs attention.',
    did: 'I built the provider dashboard for real-time monitoring, the predictive analytics that flag patients whose health is slipping, and the automated alerts, all connected to medical devices and EHR systems.',
    decisions: [
      {
        title: 'Live on screen, history in the database',
        text: 'Readings reach the dashboard as they arrive and are kept in PostgreSQL, so providers see the moment and the trend behind it.',
        nodes: ['ingest', 'dash', 'db'],
      },
      {
        title: 'Predictions that raise a hand',
        text: 'Predictive analytics watch each patient’s readings and turn a slipping trend into an alert for the care team.',
        nodes: ['model', 'alerts'],
      },
      {
        title: 'FHIR at the edges',
        text: 'Devices and EHR systems connect through FHIR, so readings can flow into the patient record.',
        nodes: ['ehr'],
      },
    ],
    stack: ['React', 'Node.js', 'PostgreSQL', 'AI and ML', 'FHIR'],
    healthcare: true,
    color: CHANNELS.spo2,
    diagram: {
      nodes: [
        { id: 'devices', label: 'Devices', x: 46, y: 60 },
        { id: 'ingest', label: 'Ingest', x: 146, y: 60 },
        { id: 'db', label: 'PostgreSQL', x: 258, y: 60 },
        { id: 'dash', label: 'Dashboard', x: 372, y: 60 },
        { id: 'ehr', label: 'EHR · FHIR', x: 136, y: 170 },
        { id: 'model', label: 'Risk model', x: 258, y: 170 },
        { id: 'alerts', label: 'Alerts', x: 372, y: 170 },
      ],
      edges: [
        ['devices', 'ingest'],
        ['ingest', 'db'],
        ['db', 'dash'],
        ['ingest', 'ehr', true],
        ['db', 'model'],
        ['model', 'alerts'],
        ['alerts', 'dash'],
      ],
    },
  },
  {
    slug: 'integration',
    domain: 'EHR integration for patient assistance',
    field: 'Healthcare · Integration',
    role: 'Healthcare integration specialist',
    summary: 'Connecting a patient assistance platform to the hospital record in Epic.',
    did: 'I built the integration layer between the platform and Epic: patient data sync, medication management and clinical workflow automation.',
    decisions: [
      {
        title: 'One layer in between',
        text: 'A single integration layer owns every connection to the hospital record, so the platform never talks to the EHR directly and changes on either side stay contained.',
        nodes: ['layer'],
      },
      {
        title: 'FHIR and HL7 side by side',
        text: 'The layer speaks both FHIR and HL7, and each workflow uses the interface it needs.',
        nodes: ['fhirapi', 'hl7'],
      },
      {
        title: 'Compliance from the first line',
        text: 'HIPAA compliance and data security were requirements from day one, not a later audit.',
        nodes: ['hipaa'],
      },
    ],
    stack: ['FHIR', 'HL7', 'Epic APIs', 'SMART on FHIR', 'Medplum', 'Node.js'],
    healthcare: true,
    color: CHANNELS.violet,
    diagram: {
      nodes: [
        { id: 'platform', label: 'Platform', x: 58, y: 115 },
        { id: 'smart', label: 'SMART on FHIR', x: 200, y: 36 },
        { id: 'layer', label: 'Integration layer', x: 200, y: 115 },
        { id: 'hipaa', label: 'HIPAA controls', x: 200, y: 194 },
        { id: 'fhirapi', label: 'Epic FHIR', x: 360, y: 64 },
        { id: 'hl7', label: 'Epic HL7', x: 360, y: 166 },
      ],
      edges: [
        ['platform', 'layer', true],
        ['smart', 'layer'],
        ['layer', 'hipaa'],
        ['layer', 'fhirapi', true],
        ['layer', 'hl7', true],
      ],
    },
  },
  {
    slug: 'mental-health',
    domain: 'Mental health assistant',
    field: 'Healthcare · AI',
    role: 'AI integration lead',
    summary: 'Support between sessions: personal recommendations, and mood tracked over time.',
    did: 'I led the AI integration for a conversational assistant for mental health support, alongside secure video therapy sessions and a dashboard where therapists follow each patient’s progress.',
    decisions: [
      {
        title: 'The model sits behind the API',
        text: 'Conversations reach the language model through the NestJS backend, so prompts and safety rules live in one place.',
        nodes: ['api', 'llm'],
      },
      {
        title: 'Video straight between people',
        text: 'Therapy sessions run on WebRTC, peer to peer between therapist and patient.',
        nodes: ['video'],
      },
      {
        title: 'Records that can grow',
        text: 'Check-ins and conversations are documents in MongoDB, free to gain new fields as the product learns.',
        nodes: ['mongo'],
      },
    ],
    stack: ['React', 'OpenAI API', 'NestJS', 'MongoDB', 'WebRTC'],
    healthcare: true,
    color: CHANNELS.bp,
    diagram: {
      nodes: [
        { id: 'patient', label: 'Patient app', x: 66, y: 58 },
        { id: 'api', label: 'NestJS API', x: 210, y: 58 },
        { id: 'llm', label: 'Language model', x: 352, y: 58 },
        { id: 'video', label: 'WebRTC', x: 66, y: 176 },
        { id: 'mongo', label: 'MongoDB', x: 210, y: 176 },
        { id: 'therapist', label: 'Therapist', x: 352, y: 176 },
      ],
      edges: [
        ['patient', 'api', true],
        ['api', 'llm', true],
        ['api', 'mongo'],
        ['mongo', 'therapist'],
        ['patient', 'video', true],
        ['video', 'therapist', true],
      ],
    },
  },
  {
    slug: 'birth',
    domain: 'Childbirth planning model',
    field: 'Healthcare · Machine learning',
    role: 'ML engineer and full stack developer',
    summary: 'A machine learning model that helps expectant mothers and their doctors plan for birth.',
    did: 'I trained a predictive model on historical birth data, and built the web interface patients and doctors use and the secure data pipeline that keeps the model improving.',
    decisions: [
      {
        title: 'The model as a service',
        text: 'The TensorFlow model is served through FastAPI, so the model and the interface can ship on their own schedules.',
        nodes: ['api'],
      },
      {
        title: 'A loop that keeps learning',
        text: 'New outcomes flow back through a secure pipeline into training, so predictions improve over time.',
        nodes: ['pipeline', 'train'],
      },
      {
        title: 'One app, two audiences',
        text: 'Patients and doctors use the same React app, each with views of their own.',
        nodes: ['app'],
      },
    ],
    stack: ['Python', 'TensorFlow', 'FastAPI', 'React', 'PostgreSQL'],
    healthcare: true,
    color: CHANNELS.resp,
    diagram: {
      nodes: [
        { id: 'history', label: 'Birth records', x: 70, y: 60 },
        { id: 'train', label: 'TensorFlow', x: 210, y: 60 },
        { id: 'api', label: 'FastAPI', x: 352, y: 60 },
        { id: 'pipeline', label: 'Secure pipeline', x: 210, y: 176 },
        { id: 'app', label: 'React app', x: 352, y: 176 },
      ],
      edges: [
        ['history', 'train'],
        ['train', 'api'],
        ['api', 'app', true],
        ['app', 'pipeline'],
        ['pipeline', 'train'],
      ],
    },
  },
  {
    slug: 'bi',
    domain: 'Collaborative business intelligence',
    field: 'Data · Real time',
    role: 'Frontend architect',
    summary: 'Teams create, share and iterate on reports together, in real time.',
    did: 'I architected the frontend: a real-time collaborative interface for data visualisation, a drag-and-drop report builder, and sharing with fine-grained permissions.',
    decisions: [
      {
        title: 'One store, many editors',
        text: 'Report state lives in Redux Toolkit and syncs over WebSockets, so everyone sees the same report as it changes.',
        nodes: ['ws', 'store'],
      },
      {
        title: 'D3 draws, React arranges',
        text: 'D3 renders the charts, while React owns the layout, the builder and the sharing screens.',
        nodes: ['charts', 'builder'],
      },
      {
        title: 'Permissions per report',
        text: 'Every report carries fine-grained sharing: who can view it, edit it or pass it on.',
        nodes: ['perms'],
      },
    ],
    stack: ['React', 'Redux Toolkit', 'D3.js', 'WebSocket', 'Material UI'],
    healthcare: false,
    color: CHANNELS.temp,
    diagram: {
      nodes: [
        { id: 'a', label: 'Editor', x: 40, y: 52 },
        { id: 'b', label: 'Editor', x: 40, y: 178 },
        { id: 'ws', label: 'WebSocket', x: 142, y: 115 },
        { id: 'store', label: 'Redux', x: 258, y: 115 },
        { id: 'charts', label: 'D3 charts', x: 370, y: 40 },
        { id: 'builder', label: 'Builder', x: 370, y: 115 },
        { id: 'perms', label: 'Sharing', x: 370, y: 190 },
      ],
      edges: [
        ['a', 'ws', true],
        ['b', 'ws', true],
        ['ws', 'store', true],
        ['store', 'charts'],
        ['store', 'builder', true],
        ['store', 'perms'],
      ],
    },
  },
  {
    slug: 'credit-apis',
    domain: 'Credit data API subscriptions',
    field: 'Fintech · APIs',
    role: 'Full stack developer',
    summary: 'Financial and credit data APIs, sold by subscription in tiers.',
    did: 'I built usage-based billing on Stripe, API rate limiting, an analytics dashboard and automated customer onboarding.',
    decisions: [
      {
        title: 'Pay for what you use',
        text: 'Every call is metered and billed by tier through Stripe.',
        nodes: ['stripe'],
      },
      {
        title: 'Limits that hold everywhere',
        text: 'Request counts live in Redis, so rate limits apply across every server rather than per instance.',
        nodes: ['redis'],
      },
      {
        title: 'The same containers everywhere',
        text: 'The whole stack runs in Docker, so development matches production.',
        nodes: ['api', 'pg'],
      },
    ],
    stack: ['Next.js', 'Stripe', 'PostgreSQL', 'Redis', 'Docker'],
    healthcare: false,
    color: CHANNELS.blue,
    diagram: {
      nodes: [
        { id: 'client', label: 'Customers', x: 52, y: 115 },
        { id: 'api', label: 'Next.js API', x: 172, y: 115 },
        { id: 'redis', label: 'Redis', x: 305, y: 40 },
        { id: 'data', label: 'Credit data', x: 305, y: 115 },
        { id: 'stripe', label: 'Stripe', x: 305, y: 190 },
        { id: 'pg', label: 'PostgreSQL', x: 172, y: 200 },
      ],
      edges: [
        ['client', 'api', true],
        ['api', 'redis', true],
        ['api', 'data', true],
        ['api', 'stripe'],
        ['api', 'pg', true],
        ['stripe', 'pg'],
      ],
    },
  },
];

export const TOOLKIT = [
  {
    area: 'Healthcare',
    note: 'Interoperability, clinical workflows and compliance.',
    color: CHANNELS.bp,
    items: ['FHIR', 'HL7', 'SMART on FHIR', 'Medplum', 'Epic integration', 'EHR systems', 'HIPAA'],
  },
  {
    area: 'Frontend',
    note: 'Interfaces that stay calm under complexity.',
    color: CHANNELS.spo2,
    items: ['React', 'TypeScript', 'Next.js', 'Astro', 'Redux Toolkit', 'Material UI', 'Tailwind CSS', 'GSAP', 'Three.js'],
  },
  {
    area: 'Backend',
    note: 'Services and data that scale.',
    color: CHANNELS.violet,
    items: ['Node.js', 'NestJS', 'Express', 'PostgreSQL', 'MongoDB', 'Redis', 'Cloudflare Workers'],
  },
  {
    area: 'AI and tools',
    note: 'Models where they help, and the tools to ship.',
    color: CHANNELS.ecg,
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

/** The one thing outside client work that the page links to. */
export const SIDE_QUEST = {
  name: 'Qwantarc Farms',
  href: 'https://farms.qwantarc.com',
  text: 'A plant nursery online, where every plant is drawn by code, leans toward your cursor and follows the sun as you scroll.',
};

export const TOPICS = ['A project', 'Hiring', 'Mentorship', 'Just saying hello'];

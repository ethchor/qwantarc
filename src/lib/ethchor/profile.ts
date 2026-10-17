/**
 * Vimu Kale's portfolio (ethchor.qwantarc.com): everything the page says, in one place.
 *
 * Client and product names stay private. Each case leads with the problem, then the work and the
 * architecture decisions behind it, with a small system diagram: nodes sit on a 420 by 230 grid,
 * and each decision lists the nodes it is about, so hovering it lights them up.
 */

export const PERSON = {
  name: 'Vimu Kale',
  handle: 'ethchor',
  origin: 'https://ethchor.qwantarc.com',
  role: 'Software engineer',
  links: [
    { label: 'GitHub', href: 'https://github.com/ethchor' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vimu-kale-808186191/' },
  ],
};

/** What the work is about, in the hero. */
export const FOCUS = ['AI', 'Architecture', 'Optimisation'];

/** How a tangle becomes a solution. The red thread draws a figure for each step. */
export const METHOD = [
  {
    title: 'Find the shape',
    text: 'Most problems are hard because nobody has framed them yet. I work out what would make the problem go away before deciding what to build.',
    figure: 'The shape',
  },
  {
    title: 'Design the simplest system',
    text: 'Then the smallest architecture that solves it: clear boundaries, standard interfaces, nothing clever without a reason.',
    figure: 'The system',
  },
  {
    title: 'Make it fast',
    text: 'Finally I measure, and optimise where the numbers say it matters, not where it feels like it might.',
    figure: 'The speed',
  },
];

/**
 * What a node is, drawn as a Bauhaus shape in its chip (Kandinsky's pairing of shape and colour):
 * people and the apps they use as yellow triangles, services as blue circles, data as red squares,
 * and systems outside the build as black half-discs.
 */
export type NodeKind = 'app' | 'service' | 'data' | 'outside';

export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
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
  /** The problem it solved, as a headline. */
  title: string;
  /** Where it lives. Never the client or product. */
  domain: string;
  /** What kind of problem it was. */
  tags: string[];
  role: string;
  /** What made it hard. */
  problem: string;
  /** What I built. */
  did: string;
  decisions: Decision[];
  stack: string[];
  diagram: Diagram;
}

export const CASES: Case[] = [
  {
    slug: 'monitoring',
    title: 'Early warnings from a live stream of vitals',
    domain: 'Remote patient monitoring',
    tags: ['AI', 'Real-time data'],
    role: 'Senior full stack engineer',
    problem:
      'Medical devices send readings around the clock, and a care team can only watch so many screens. What matters is the trend in someone’s numbers, not any single reading.',
    did: 'I built the real-time provider dashboard, the predictive analytics that flag patients whose health is slipping, and the automated alerts, connected to medical devices and EHR systems.',
    decisions: [
      {
        title: 'Live on screen, history in the database',
        text: 'Readings reach the dashboard as they arrive and are kept in PostgreSQL, so providers see the moment and the trend behind it.',
        nodes: ['ingest', 'dash', 'db'],
      },
      {
        title: 'Predictions that raise a hand',
        text: 'A risk model watches each patient’s readings and turns a slipping trend into an alert for the care team.',
        nodes: ['model', 'alerts'],
      },
      {
        title: 'Standards at the edges',
        text: 'Devices and EHR systems connect through FHIR, so readings flow into the patient record.',
        nodes: ['ehr'],
      },
    ],
    stack: ['React', 'Node.js', 'PostgreSQL', 'Machine learning', 'FHIR'],
    diagram: {
      nodes: [
        { id: 'devices', label: 'Devices', kind: 'outside', x: 46, y: 60 },
        { id: 'ingest', label: 'Ingest', kind: 'service', x: 146, y: 60 },
        { id: 'db', label: 'PostgreSQL', kind: 'data', x: 258, y: 60 },
        { id: 'dash', label: 'Dashboard', kind: 'app', x: 372, y: 60 },
        { id: 'ehr', label: 'EHR · FHIR', kind: 'outside', x: 136, y: 170 },
        { id: 'model', label: 'Risk model', kind: 'service', x: 258, y: 170 },
        { id: 'alerts', label: 'Alerts', kind: 'service', x: 372, y: 170 },
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
    slug: 'prediction',
    title: 'A prediction model that learns from every outcome',
    domain: 'Maternal health',
    tags: ['Machine learning', 'End to end'],
    role: 'ML engineer and full stack developer',
    problem:
      'Expectant mothers and their doctors plan for birth with incomplete information. A model can help, but only if it stays accurate as new outcomes come in.',
    did: 'I trained a predictive model on historical birth data, served it behind an API, and built the web app patients and doctors use, plus the secure pipeline that feeds new outcomes back into training.',
    decisions: [
      {
        title: 'The model as a service',
        text: 'The TensorFlow model is served through FastAPI, so the model and the interface ship on their own schedules.',
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
    diagram: {
      nodes: [
        { id: 'history', label: 'Past outcomes', kind: 'data', x: 70, y: 60 },
        { id: 'train', label: 'TensorFlow', kind: 'service', x: 210, y: 60 },
        { id: 'api', label: 'FastAPI', kind: 'service', x: 352, y: 60 },
        { id: 'pipeline', label: 'Secure pipeline', kind: 'service', x: 210, y: 176 },
        { id: 'app', label: 'React app', kind: 'app', x: 352, y: 176 },
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
    slug: 'assistant',
    title: 'A language model where trust matters most',
    domain: 'Mental health support',
    tags: ['LLMs', 'Product'],
    role: 'AI integration lead',
    problem:
      'People need support between therapy sessions. A conversational assistant can help, but only if its prompts, safety rules and data are handled with real care.',
    did: 'I led the AI integration for a conversational assistant that offers personal recommendations and tracks mood over time, alongside secure video sessions and a dashboard where therapists follow progress.',
    decisions: [
      {
        title: 'The model sits behind the API',
        text: 'Conversations reach the language model through the NestJS backend, so prompts and safety rules live in one place.',
        nodes: ['api', 'llm'],
      },
      {
        title: 'Video straight between people',
        text: 'Sessions run on WebRTC, peer to peer between therapist and patient.',
        nodes: ['video'],
      },
      {
        title: 'Records that can grow',
        text: 'Check-ins and conversations are documents in MongoDB, free to gain new fields as the product learns.',
        nodes: ['mongo'],
      },
    ],
    stack: ['React', 'OpenAI API', 'NestJS', 'MongoDB', 'WebRTC'],
    diagram: {
      nodes: [
        { id: 'patient', label: 'Patient app', kind: 'app', x: 66, y: 58 },
        { id: 'api', label: 'NestJS API', kind: 'service', x: 210, y: 58 },
        { id: 'llm', label: 'Language model', kind: 'outside', x: 352, y: 58 },
        { id: 'video', label: 'WebRTC', kind: 'service', x: 66, y: 176 },
        { id: 'mongo', label: 'MongoDB', kind: 'data', x: 210, y: 176 },
        { id: 'therapist', label: 'Therapist', kind: 'app', x: 352, y: 176 },
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
    slug: 'platform',
    title: 'A platform built to change one piece at a time',
    domain: 'Healthcare operations',
    tags: ['Architecture', 'Platform'],
    role: 'Full stack developer',
    problem:
      'Scheduling, documentation and care plans each have their own rules, and all of them touch the same records. Built as one block, every change would risk the rest.',
    did: 'I architected and built both sides: the modular API that moves the data, and the screens teams work in all day, from scheduling and documentation to care plans and real-time insights.',
    decisions: [
      {
        title: 'One module per workflow',
        text: 'The NestJS API is split into modules for scheduling, documentation and care plans, each with its own boundaries, so one can change without breaking the others.',
        nodes: ['sched', 'docs', 'plans'],
      },
      {
        title: 'A standard as the data model',
        text: 'Records live as FHIR resources on Medplum rather than in a schema of our own, so the data stays portable and every integration speaks the same language.',
        nodes: ['fhir'],
      },
      {
        title: 'Access through the standard',
        text: 'People sign in with SMART on FHIR and OAuth2, so permissions follow the standard instead of custom rules.',
        nodes: ['smart'],
      },
    ],
    stack: ['React', 'NestJS', 'TypeScript', 'Medplum', 'FHIR', 'SMART on FHIR', 'OAuth2'],
    diagram: {
      nodes: [
        { id: 'patient', label: 'Patient app', kind: 'app', x: 130, y: 30 },
        { id: 'team', label: 'Team app', kind: 'app', x: 290, y: 30 },
        { id: 'smart', label: 'SMART on FHIR', kind: 'service', x: 210, y: 90 },
        { id: 'sched', label: 'Scheduling', kind: 'service', x: 80, y: 150 },
        { id: 'docs', label: 'Documentation', kind: 'service', x: 210, y: 150 },
        { id: 'plans', label: 'Care plans', kind: 'service', x: 340, y: 150 },
        { id: 'fhir', label: 'Medplum', kind: 'data', x: 210, y: 205 },
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
    slug: 'collaboration',
    title: 'Many people, one live report',
    domain: 'Business intelligence',
    tags: ['Real-time', 'Frontend architecture'],
    role: 'Frontend architect',
    problem: 'Teams wanted to build and edit reports together, live, instead of passing files around and waiting for refreshes.',
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
    diagram: {
      nodes: [
        { id: 'a', label: 'Editor', kind: 'app', x: 40, y: 52 },
        { id: 'b', label: 'Editor', kind: 'app', x: 40, y: 178 },
        { id: 'ws', label: 'WebSocket', kind: 'service', x: 142, y: 115 },
        { id: 'store', label: 'Redux', kind: 'data', x: 258, y: 115 },
        { id: 'charts', label: 'D3 charts', kind: 'app', x: 370, y: 40 },
        { id: 'builder', label: 'Builder', kind: 'app', x: 370, y: 115 },
        { id: 'perms', label: 'Sharing', kind: 'service', x: 370, y: 190 },
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
    slug: 'integration',
    title: 'One clean layer between a platform and a hospital',
    domain: 'Hospital records',
    tags: ['Systems integration'],
    role: 'Integration specialist',
    problem:
      'A patient assistance platform needed data from Epic, which speaks two standards and changes on its own schedule. Wired straight to it, the platform would inherit every quirk.',
    did: 'I built the integration layer between the platform and Epic: patient data sync, medication management and workflow automation, with HIPAA compliance from day one.',
    decisions: [
      {
        title: 'One layer in between',
        text: 'A single integration layer owns every connection to the hospital record, so changes on either side stay contained.',
        nodes: ['layer'],
      },
      {
        title: 'FHIR and HL7 side by side',
        text: 'The layer speaks both standards, and each workflow uses the interface it needs.',
        nodes: ['fhirapi', 'hl7'],
      },
      {
        title: 'Compliance from the first line',
        text: 'HIPAA compliance and data security were requirements from day one, not a later audit.',
        nodes: ['hipaa'],
      },
    ],
    stack: ['FHIR', 'HL7', 'Epic APIs', 'SMART on FHIR', 'Medplum', 'Node.js'],
    diagram: {
      nodes: [
        { id: 'platform', label: 'Platform', kind: 'app', x: 58, y: 115 },
        { id: 'smart', label: 'SMART on FHIR', kind: 'service', x: 200, y: 36 },
        { id: 'layer', label: 'Integration layer', kind: 'service', x: 200, y: 115 },
        { id: 'hipaa', label: 'HIPAA controls', kind: 'service', x: 200, y: 194 },
        { id: 'fhirapi', label: 'Epic FHIR', kind: 'outside', x: 360, y: 64 },
        { id: 'hl7', label: 'Epic HL7', kind: 'outside', x: 360, y: 166 },
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
    slug: 'metering',
    title: 'Metering and limits that hold on every server',
    domain: 'Fintech data APIs',
    tags: ['APIs', 'Distributed systems'],
    role: 'Full stack developer',
    problem:
      'Selling data APIs by subscription means counting every call, enforcing each tier’s limits and billing for usage, consistently, however many servers are running.',
    did: 'I built usage-based billing on Stripe, distributed rate limiting, an analytics dashboard and automated customer onboarding.',
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
    diagram: {
      nodes: [
        { id: 'client', label: 'Customers', kind: 'app', x: 52, y: 115 },
        { id: 'api', label: 'Next.js API', kind: 'service', x: 172, y: 115 },
        { id: 'redis', label: 'Redis', kind: 'data', x: 305, y: 40 },
        { id: 'data', label: 'Credit data', kind: 'data', x: 305, y: 115 },
        { id: 'stripe', label: 'Stripe', kind: 'outside', x: 305, y: 190 },
        { id: 'pg', label: 'PostgreSQL', kind: 'data', x: 172, y: 200 },
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

/** What the work covers. The range prints each as one plate of a risograph, in its own ink. */
export const CAPABILITIES = [
  {
    area: 'AI and machine learning',
    short: 'AI',
    ink: 'pink',
    note: 'Models where they earn their place, and everything around them.',
    items: ['LLM integration', 'OpenAI API', 'On-device AI', 'MCP', 'TensorFlow', 'Python', 'FastAPI', 'Predictive models'],
  },
  {
    area: 'Architecture',
    short: 'Architecture',
    ink: 'blue',
    note: 'Systems that stay simple as they grow.',
    items: ['System design', 'Modular APIs', 'NestJS', 'Real-time: WebSocket and WebRTC', 'Integration layers', 'FHIR and HL7', 'Docker', 'AWS'],
  },
  {
    area: 'Performance and scale',
    short: 'Performance',
    ink: 'yellow',
    note: 'Measure first, then make it fast.',
    items: ['Redis', 'PostgreSQL', 'MongoDB', 'Rate limiting', 'Cloudflare Workers', 'WebGL'],
  },
  {
    area: 'Product engineering',
    short: 'Product',
    ink: 'teal',
    note: 'The interface is part of the solution.',
    items: ['React', 'TypeScript', 'Next.js', 'Node.js', 'Astro', 'D3.js', 'GSAP', 'Three.js'],
  },
];

/** The domains the work shipped in, and what happens around the code. */
export const ALSO =
  'Shipped in healthcare, fintech and business intelligence. Around the code, I mentor developers, pair on the hard parts and review to share the why, not just the what.';

/** The one thing outside client work that the page links to. */
export const SIDE_QUEST = {
  name: 'Qwantarc Farms',
  href: 'https://farms.qwantarc.com',
  text: 'A plant nursery online, where every plant is drawn by code, leans toward your cursor and follows the sun as you scroll.',
};

export const TOPICS = ['A hard problem', 'A role', 'Mentorship', 'Just saying hello'];

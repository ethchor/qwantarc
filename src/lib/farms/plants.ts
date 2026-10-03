/**
 * Qwantarc Farms: the nursery's details and the plants it sells. Edit this file to change what
 * the site shows; every plant is drawn from its `art` and `seed` (see flora.ts).
 */

export const NURSERY = {
  name: 'Qwantarc Farms',
  origin: 'https://farms.qwantarc.com',
  email: 'vimu@qwantarc.com',
  /** WhatsApp number with country code, digits only (e.g. 919800000000). Empty hides the button. */
  whatsapp: '',
  /** Phone number to call, as people should dial it. Empty hides it. */
  phone: '',
  /** Where to find the nursery. Empty hides the visit details. */
  address: '',
  hours: '',
  mapUrl: '',
};

export type LightLevel = 1 | 2 | 3 | 4;

export const LIGHTS: { level: LightLevel; name: string; text: string }[] = [
  { level: 1, name: 'Shade', text: 'No direct sun. Deeper inside a room, or a north-facing balcony.' },
  { level: 2, name: 'Bright shade', text: 'Plenty of light but no sun on the leaves. Near a bright window, or under a covered balcony.' },
  { level: 3, name: 'Part sun', text: 'Two to five hours of direct sun, best in the morning. An east-facing balcony.' },
  { level: 4, name: 'Full sun', text: 'Six hours or more of direct sun. An open terrace or a garden bed.' },
];

export type Place = 'indoors' | 'balcony' | 'garden' | 'fence';

export const PLACES: { id: Place; name: string }[] = [
  { id: 'indoors', name: 'Indoors' },
  { id: 'balcony', name: 'Balcony' },
  { id: 'garden', name: 'Garden' },
  { id: 'fence', name: 'Fence or arch' },
];

export const WATER = ['', 'Little water', 'Regular water', 'Plenty of water'] as const;

export const FAMILIES = ['Palms', 'Climbers', 'Flowering', 'Indoor', 'Fruit and kitchen'] as const;
export type Family = (typeof FAMILIES)[number];

export interface Plant {
  slug: string;
  /** Which drawing (a species in flora.ts) and which variation of it. */
  art: string;
  seed: number;
  name: string;
  latin: string;
  aka?: string;
  family: Family;
  /** The range of light it grows well in. */
  light: [LightLevel, LightLevel];
  water: 1 | 2 | 3;
  places: Place[];
  size: string;
  note: string;
  care: string[];
}

export const PLANTS: Plant[] = [
  {
    slug: 'areca-palm',
    art: 'areca',
    seed: 12,
    name: 'Areca palm',
    latin: 'Dypsis lutescens',
    family: 'Palms',
    light: [2, 3],
    water: 2,
    places: ['indoors', 'balcony', 'garden'],
    size: 'Grows to 2 to 3 m in a large pot',
    note: 'Feathery, arching fronds on clumps of golden canes. The classic palm for a bright corner or a shaded terrace.',
    care: [
      'Bright light, without harsh afternoon sun on the fronds.',
      'Water when the top few centimetres of soil feel dry.',
      'Brown tips usually mean dry air or salty water. Rainwater helps.',
    ],
  },
  {
    slug: 'lady-palm',
    art: 'lady-palm',
    seed: 23,
    name: 'Lady palm',
    latin: 'Rhapis excelsa',
    family: 'Palms',
    light: [1, 2],
    water: 2,
    places: ['indoors', 'balcony'],
    size: 'Slowly grows to 1.5 to 2.5 m',
    note: 'Fans of broad, glossy fingers on slim, fibrous canes. One of the few palms that is happy in low light.',
    care: [
      'Shade or bright, indirect light.',
      'Keep the soil lightly moist, never soggy.',
      'It grows slowly, so repot only every two or three years.',
    ],
  },
  {
    slug: 'coral-vine',
    art: 'coral-vine',
    seed: 31,
    name: 'Coral vine',
    latin: 'Antigonon leptopus',
    family: 'Climbers',
    light: [3, 4],
    water: 2,
    places: ['garden', 'fence'],
    size: 'Climbs 3 to 6 m',
    note: 'Heart-shaped leaves and long sprays of small pink flowers that cover a fence or an arch through the warm months.',
    care: [
      'Full sun gives the most flowers.',
      'Give it something to climb. It holds on with tendrils.',
      'Once settled in the ground, it copes well with dry spells.',
    ],
  },
  {
    slug: 'rangoon-creeper',
    art: 'rangoon-creeper',
    seed: 44,
    name: 'Rangoon creeper',
    latin: 'Combretum indicum',
    aka: 'Madhumalti',
    family: 'Climbers',
    light: [3, 4],
    water: 2,
    places: ['balcony', 'garden', 'fence'],
    size: 'Climbs 3 to 8 m',
    note: 'Fragrant hanging clusters that open white and turn pink, then red, so every colour is on the vine at once.',
    care: [
      'At least half a day of sun.',
      'A strong support: it grows vigorously and gets heavy.',
      'Prune after flowering to keep it in shape.',
    ],
  },
  {
    slug: 'bougainvillea',
    art: 'bougainvillea',
    seed: 52,
    name: 'Bougainvillea',
    latin: 'Bougainvillea glabra',
    family: 'Climbers',
    light: [4, 4],
    water: 1,
    places: ['balcony', 'garden', 'fence'],
    size: 'Grows 1 to 6 m, pruned or trained',
    note: 'Papery magenta bracts that last for weeks. It flowers best when it is a little dry and in full sun.',
    care: [
      'As much direct sun as you can give it.',
      'Let the soil dry between waterings. Too much water means leaves, not flowers.',
      'Wear gloves when pruning: the stems have thorns.',
    ],
  },
  {
    slug: 'money-plant',
    art: 'money-plant',
    seed: 63,
    name: 'Money plant',
    latin: 'Epipremnum aureum',
    aka: 'Pothos',
    family: 'Indoor',
    light: [1, 2],
    water: 2,
    places: ['indoors', 'balcony'],
    size: 'Trails or climbs 1 to 3 m indoors',
    note: 'Heart-shaped, gold-marbled leaves that trail from a shelf or climb a moss pole. Very hard to kill.',
    care: [
      'Any indirect light. It slows down in deep shade but keeps going.',
      'Water when the top half of the soil is dry.',
      'Keep it away from pets that chew leaves.',
    ],
  },
  {
    slug: 'snake-plant',
    art: 'snake-plant',
    seed: 71,
    name: 'Snake plant',
    latin: 'Dracaena trifasciata',
    family: 'Indoor',
    light: [1, 3],
    water: 1,
    places: ['indoors', 'balcony'],
    size: 'Grows to 60 to 120 cm',
    note: 'Upright, banded leaves edged in yellow. It asks for almost nothing: a little water and whatever light you have.',
    care: [
      'Water only when the soil is completely dry, about every two to three weeks.',
      'Overwatering is the one sure way to lose it.',
      'Happy in a corner, happier near a window.',
    ],
  },
  {
    slug: 'rubber-plant',
    art: 'rubber-plant',
    seed: 84,
    name: 'Rubber plant',
    latin: 'Ficus elastica',
    family: 'Indoor',
    light: [2, 3],
    water: 2,
    places: ['indoors', 'balcony'],
    size: 'Grows to 1.5 to 3 m indoors',
    note: 'Big, glossy, near-black leaves on a single stem, each new one unfurling from a red sheath.',
    care: [
      'Bright, indirect light keeps the leaves dark and shiny.',
      'Water when the top few centimetres are dry.',
      'Wipe the leaves now and then, and turn the pot so it grows straight.',
    ],
  },
  {
    slug: 'peace-lily',
    art: 'peace-lily',
    seed: 95,
    name: 'Peace lily',
    latin: 'Spathiphyllum wallisii',
    family: 'Indoor',
    light: [1, 2],
    water: 3,
    places: ['indoors'],
    size: 'Grows to 40 to 70 cm',
    note: 'Deep green leaves and white flowers, even in a room with little sun. It droops when thirsty and stands up again within hours of watering.',
    care: [
      'Shade or bright, indirect light. No direct sun.',
      'Keep the soil evenly moist.',
      'Brown tips often mean hard water. Let tap water stand overnight first.',
    ],
  },
  {
    slug: 'hibiscus',
    art: 'hibiscus',
    seed: 106,
    name: 'Hibiscus',
    latin: 'Hibiscus rosa-sinensis',
    aka: 'Jaswand',
    family: 'Flowering',
    light: [3, 4],
    water: 3,
    places: ['balcony', 'garden'],
    size: 'Grows to 1 to 2.5 m',
    note: 'Large red flowers that last a day each, with another one ready to open the next morning.',
    care: [
      'Six hours of sun for steady flowering.',
      'Keep the soil evenly moist in summer. Pots dry out fast.',
      'Feed every two to three weeks while it is flowering.',
    ],
  },
  {
    slug: 'ixora',
    art: 'ixora',
    seed: 117,
    name: 'Ixora',
    latin: 'Ixora coccinea',
    family: 'Flowering',
    light: [3, 4],
    water: 2,
    places: ['balcony', 'garden'],
    size: 'Grows to 1 to 1.5 m',
    note: 'Dense, glossy leaves and round clusters of tiny orange-red flowers for much of the year.',
    care: [
      'Sun for most of the day.',
      'It likes slightly acidic soil. Yellow leaves with green veins mean it needs iron.',
      'Trim after a flush of flowers to keep it compact.',
    ],
  },
  {
    slug: 'mogra',
    art: 'mogra',
    seed: 128,
    name: 'Mogra',
    latin: 'Jasminum sambac',
    aka: 'Arabian jasmine',
    family: 'Flowering',
    light: [3, 4],
    water: 2,
    places: ['balcony', 'garden'],
    size: 'Grows to 1 to 2 m, kept bushy',
    note: 'Small, double white flowers with the strongest scent in the nursery, at their best on summer evenings.',
    care: [
      'Full sun for the most flowers.',
      'Water regularly in summer and less in winter.',
      'Prune after flowering to keep it bushy.',
    ],
  },
  {
    slug: 'desert-rose',
    art: 'adenium',
    seed: 139,
    name: 'Desert rose',
    latin: 'Adenium obesum',
    aka: 'Adenium',
    family: 'Flowering',
    light: [4, 4],
    water: 1,
    places: ['balcony', 'garden'],
    size: 'Grows to 30 cm to 1 m in a pot',
    note: 'A swollen, sculptural trunk crowned with pink trumpet flowers. It thrives on sun and a little neglect.',
    care: [
      'Full sun, as much as possible.',
      'Water only when the soil is dry, and much less in winter.',
      'The sap is toxic, so wash your hands after pruning.',
    ],
  },
  {
    slug: 'lemon',
    art: 'lemon',
    seed: 141,
    name: 'Lemon',
    latin: 'Citrus limon',
    aka: 'Nimbu',
    family: 'Fruit and kitchen',
    light: [3, 4],
    water: 2,
    places: ['balcony', 'garden'],
    size: 'Grows to 1.5 to 3 m in a large pot',
    note: 'Glossy leaves, fragrant white blossom and lemons you can pick, even from a large pot on a terrace.',
    care: [
      'Six or more hours of sun for fruit.',
      'Water deeply, then let the top layer dry.',
      'Feed through the growing season with a citrus or general fertiliser.',
    ],
  },
  {
    slug: 'curry-leaf',
    art: 'curry-leaf',
    seed: 152,
    name: 'Curry leaf',
    latin: 'Murraya koenigii',
    aka: 'Kadipatta',
    family: 'Fruit and kitchen',
    light: [3, 4],
    water: 2,
    places: ['balcony', 'garden'],
    size: 'Grows to 1.5 to 4 m',
    note: 'The kitchen essential. Pick a sprig whenever you need one and it grows back bushier.',
    care: [
      'Sun for most of the day.',
      'Pinch out the tips to keep it bushy.',
      'Water less in winter, when it rests.',
    ],
  },
  {
    slug: 'tulsi',
    art: 'tulsi',
    seed: 163,
    name: 'Tulsi',
    latin: 'Ocimum tenuiflorum',
    aka: 'Holy basil',
    family: 'Fruit and kitchen',
    light: [3, 4],
    water: 2,
    places: ['balcony', 'garden'],
    size: 'Grows to 30 to 90 cm',
    note: 'Fragrant, purple-tinged leaves on a small, bushy plant that is happy on any sunny balcony.',
    care: [
      'Full sun, or at least a few hours of morning sun.',
      'Pinch off the flower spikes to keep the leaves coming.',
      'Water when the surface feels dry.',
    ],
  },
  {
    slug: 'mango',
    art: 'mango',
    seed: 174,
    name: 'Mango',
    latin: 'Mangifera indica',
    aka: 'Grafted sapling',
    family: 'Fruit and kitchen',
    light: [4, 4],
    water: 2,
    places: ['garden'],
    size: 'A tree in time. Grafted plants fruit in three to five years.',
    note: 'A grafted sapling of the tree everyone wants in their garden. Grafted plants start fruiting years sooner than ones grown from seed.',
    care: [
      'Full sun and room to grow.',
      'Water young plants regularly through their first dry season.',
      'Pick off the first flowers for a year or two, so the tree grows strong.',
    ],
  },
];

/** A day of light, told on the way down the page. */
export const HOURS = [
  {
    time: '05:45',
    word: 'Dawn',
    text: 'Water at the roots while the soil is still cool. Less is lost to the heat before the plant can drink.',
  },
  {
    time: '09:00',
    word: 'Morning',
    text: 'Morning sun is the gentle kind. Most flowering plants want four to six hours of it, and that is where the flowers come from.',
  },
  {
    time: '12:30',
    word: 'Noon',
    text: 'Shade lovers rest now. Indoor plants and young palms like bright light that never lands directly on their leaves.',
  },
];

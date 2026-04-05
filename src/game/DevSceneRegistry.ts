import { Scene } from '../engine/GameEngine';

export interface DevSceneEntry {
  name: string;
  book: string;
  color: string;
  factory: () => Promise<Scene>;
}

export const DEV_SCENES: DevSceneEntry[] = [
  // ── Book XXI ──────────────────────────────────────────────────
  {
    name: 'The Approach',
    book: 'Book XXI',
    color: '#d4b96a',
    factory: async () => {
      const { ApproachScene } = await import('./scenes/ApproachScene');
      return new ApproachScene();
    },
  },
  {
    name: 'The Courtyard',
    book: 'Book XXI',
    color: '#d4b96a',
    factory: async () => {
      const { CourtyardScene } = await import('./scenes/CourtyardScene');
      return new CourtyardScene();
    },
  },
  {
    name: 'The Great Hall',
    book: 'Book XXI',
    color: '#d4b96a',
    factory: async () => {
      const { GreatHallScene } = await import('./scenes/GreatHallScene');
      return new GreatHallScene();
    },
  },
  {
    name: 'The Corridor',
    book: 'Book XXI',
    color: '#d4b96a',
    factory: async () => {
      const { CorridorScene } = await import('./scenes/CorridorScene');
      return new CorridorScene();
    },
  },
  {
    name: 'The Bedroom',
    book: 'Book XXI',
    color: '#d4b96a',
    factory: async () => {
      const { BedroomScene } = await import('./scenes/BedroomScene');
      return new BedroomScene();
    },
  },

  // ── Book XI ───────────────────────────────────────────────────
  {
    name: 'Cimmerian Shore',
    book: 'Book XI',
    color: '#8080c0',
    factory: async () => {
      const { CimmerianShoreScene } = await import('./scenes/book11/CimmerianShoreScene');
      return new CimmerianShoreScene();
    },
  },
  {
    name: 'The Trench',
    book: 'Book XI',
    color: '#8080c0',
    factory: async () => {
      const { TrenchScene } = await import('./scenes/book11/TrenchScene');
      return new TrenchScene();
    },
  },
  {
    name: 'Parade of Shades',
    book: 'Book XI',
    color: '#8080c0',
    factory: async () => {
      const { ParadeOfShadesScene } = await import('./scenes/book11/ParadeOfShadesScene');
      return new ParadeOfShadesScene();
    },
  },
  {
    name: 'Return to Ship',
    book: 'Book XI',
    color: '#8080c0',
    factory: async () => {
      const { ReturnToShipScene } = await import('./scenes/book11/ReturnToShipScene');
      return new ReturnToShipScene();
    },
  },

  // ── Book V ────────────────────────────────────────────────────
  {
    name: 'Ogygia Shore',
    book: 'Book V',
    color: '#6aaa8a',
    factory: async () => {
      const { OgygiaShoreScene } = await import('./scenes/book5/OgygiaShoreScene');
      return new OgygiaShoreScene();
    },
  },
  {
    name: 'Calypso\'s Cave',
    book: 'Book V',
    color: '#6aaa8a',
    factory: async () => {
      const { CalypsoCaveScene } = await import('./scenes/book5/CalypsoCaveScene');
      return new CalypsoCaveScene();
    },
  },
  {
    name: 'Raft Building',
    book: 'Book V',
    color: '#6aaa8a',
    factory: async () => {
      const { RaftBuildingScene } = await import('./scenes/book5/RaftBuildingScene');
      return new RaftBuildingScene();
    },
  },
  {
    name: 'Departure',
    book: 'Book V',
    color: '#6aaa8a',
    factory: async () => {
      const { CalypsoDepartureScene } = await import('./scenes/book5/CalypsoDepartureScene');
      return new CalypsoDepartureScene();
    },
  },

  // ── Book XII ──────────────────────────────────────────────────
  {
    name: 'Circe\'s Warning',
    book: 'Book XII',
    color: '#c07070',
    factory: async () => {
      const { CirceWarningScene } = await import('./scenes/book12/CirceWarningScene');
      return new CirceWarningScene();
    },
  },
  {
    name: 'Strait Approach',
    book: 'Book XII',
    color: '#c07070',
    factory: async () => {
      const { StraitApproachScene } = await import('./scenes/book12/StraitApproachScene');
      return new StraitApproachScene();
    },
  },
  {
    name: 'Scylla Passage',
    book: 'Book XII',
    color: '#c07070',
    factory: async () => {
      const { ScyllaPassageScene } = await import('./scenes/book12/ScyllaPassageScene');
      return new ScyllaPassageScene();
    },
  },
  {
    name: 'Charybdis Escape',
    book: 'Book XII',
    color: '#c07070',
    factory: async () => {
      const { CharybdisEscapeScene } = await import('./scenes/book12/CharybdisEscapeScene');
      return new CharybdisEscapeScene();
    },
  },

  // ── Title ─────────────────────────────────────────────────────
  {
    name: 'Title Screen',
    book: '—',
    color: '#a09070',
    factory: async () => {
      const { TitleScene } = await import('./scenes/TitleScene');
      return new TitleScene();
    },
  },
];

export type LaneColor = 'green' | 'red' | 'yellow' | 'blue';

export interface LaneConfig {
  id: number;
  color: LaneColor;
  key: string;
  label: string; // The visual key label (A, S, J, K)
  xPercent: number; // Horizontal position in percentage (0-100)
}

export interface Note {
  id: number;
  laneId: number;
  y: number; // Vertical position (0 to 100)
  hit: boolean; // Has it been hit (head)?
  missed: boolean; // Has it passed the line?
  length: number; // > 0 for long notes
  isHolding?: boolean; // Is currently being held
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  isPlaying: boolean;
  isGameOver: boolean;
}

export enum GameStatus {
  MENU,
  PLAYING,
  GAME_OVER
}

export enum DifficultyLevel {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
  EXPERT = "EXPERT"
}

export interface DifficultyConfig {
  label: string;
  spawnRate: number;
  noteSpeed: number;
  color: string;
  chordChance: number;
  longNoteChance: number;
}

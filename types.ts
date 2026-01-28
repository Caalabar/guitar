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
  hit: boolean; // Has it been hit?
  missed: boolean; // Has it passed the line?
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

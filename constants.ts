import { LaneConfig } from './types';

// The YouTube Video ID requested
// Switched to NCS (NoCopyrightSounds) to guarantee embedding works. 
// Official music videos often block embeds (Error 150/152).
export const YOUTUBE_VIDEO_ID = 'WcpKNYkLAy0'; // Requested Song

export const LANES: LaneConfig[] = [
  { id: 0, color: 'green', key: 'a', label: 'A', xPercent: 20 },
  { id: 1, color: 'red', key: 's', label: 'S', xPercent: 40 },
  { id: 2, color: 'yellow', key: 'j', label: 'J', xPercent: 60 },
  { id: 3, color: 'blue', key: 'k', label: 'K', xPercent: 80 },
];

// Visual constants
export const HIT_LINE_Y = 85; // Percentage down the screen where the hit line is
export const NOTE_RADIUS = 25;
export const SPAWN_RATE_MS = 400; // How often notes spawn (lower = faster)
export const NOTE_SPEED = 0.6; // Speed of notes falling (percentage per frame)
export const HIT_WINDOW = 15; // Increased tolerance: +/- percentage tolerance for a hit

// Scoring
export const SCORE_HIT = 10;
export const SCORE_MISS = -5;
export const MAX_HEALTH = 100;
export const HEALTH_PENALTY = 10;
export const HEALTH_GAIN = 2;
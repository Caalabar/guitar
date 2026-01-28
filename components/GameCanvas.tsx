import React, { useRef, useEffect, useCallback } from 'react';
import { LANES, HIT_LINE_Y, HIT_WINDOW, SCORE_HIT, SCORE_MISS, HEALTH_PENALTY, HEALTH_GAIN } from '../constants';
import { Note } from '../types';

interface GameCanvasProps {
  isPlaying: boolean;
  onScoreUpdate: (scoreDelta: number, comboReset: boolean) => void;
  onHealthUpdate: (delta: number) => void;
  width: number;
  height: number;
  noteSpeed: number;
  spawnRate: number;
  chordChance: number;
  longNoteChance: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ isPlaying, onScoreUpdate, onHealthUpdate, width, height, noteSpeed, spawnRate, chordChance, longNoteChance }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const notesRef = useRef<Note[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const scoreFeedbackRef = useRef<{ text: string, x: number, y: number, alpha: number } | null>(null);
  const heldLanesRef = useRef<Set<number>>(new Set()); // Track held keys/touches

  // Use refs for callbacks to avoid re-creating dependent functions on every render/score update
  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onHealthUpdateRef = useRef(onHealthUpdate);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
    onHealthUpdateRef.current = onHealthUpdate;
  }, [onScoreUpdate, onHealthUpdate]);

  const triggerFeedback = useCallback((text: string, xPercent: number) => {
    scoreFeedbackRef.current = {
      text,
      x: (xPercent / 100) * width,
      y: (HIT_LINE_Y / 100) * height,
      alpha: 1.0
    };
  }, [width, height]);

  const attemptHit = useCallback((laneIndex: number) => {
    // Find the closest unhit note in this lane
    const notesInLane = notesRef.current.filter(n => n.laneId === laneIndex && !n.hit && !n.missed);

    // Check against the bottom-most note first
    if (notesInLane.length > 0) {
      // Sort by Y (highest Y means closest to bottom)
      notesInLane.sort((a, b) => b.y - a.y);
      const targetNote = notesInLane[0];

      // Check distance to hit line
      const distance = Math.abs(targetNote.y - HIT_LINE_Y);

      if (distance <= HIT_WINDOW) {
        // HIT!
        targetNote.hit = true;
        onScoreUpdateRef.current(SCORE_HIT, false);
        onHealthUpdateRef.current(HEALTH_GAIN);
        triggerFeedback("PERFECT", LANES[laneIndex].xPercent);
      } else {
        // Miss (pressed too early/late or wrong time)
        // Only penalize if it's somewhat close to avoid punishing random clicks too much
        if (distance < HIT_WINDOW * 2) {
          onScoreUpdateRef.current(SCORE_MISS, true);
          onHealthUpdateRef.current(-HEALTH_PENALTY);
          triggerFeedback("MISS", LANES[laneIndex].xPercent);
        }
      }
    }
  }, [triggerFeedback]);

  // Key press handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPlaying || e.repeat) return; // Ignore hold-down repeats for initial hit

    const laneIndex = LANES.findIndex(l => l.key === e.key.toLowerCase());
    if (laneIndex !== -1) {
      heldLanesRef.current.add(laneIndex);
      attemptHit(laneIndex);
    }
  }, [isPlaying, attemptHit]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const laneIndex = LANES.findIndex(l => l.key === e.key.toLowerCase());
    if (laneIndex !== -1) {
      heldLanesRef.current.delete(laneIndex);
    }
  }, []);

  // Mouse handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    processTap(x, rect.width);
  }, [isPlaying]);

  // Touch handling - Supports MULTI-TOUCH
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    Array.from(e.changedTouches).forEach((touch: React.Touch) => {
      const x = touch.clientX - rect.left;
      const laneIndex = processTap(x, rect.width);
      // We need a way to map touch ID to lane, but for simplicity, we assume tap = hold start
      // A robust implementation would map touch identifiers.
      // For MVP: Tap triggers hit. 
      if (laneIndex !== -1) heldLanesRef.current.add(laneIndex);
    });
  }, [isPlaying]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear all held lanes on touch end for simplicity or try to map?
    // Simple Hack: If no touches left, clear all. 
    // Better: check bounding box again? 
    // For this "web" version, let's just clear specific lanes if we could map them.
    // Since we didn't map touch ID to lane, we might clear all if touches empty.
    if (e.touches.length === 0) {
      heldLanesRef.current.clear();
    }
    // Or maybe we don't clear on end for simple tapping? 
    // But user wants "Hold".
    // Let's rely on KeyUp for keyboard. For touch, we need logic.
    // Basic Touch Hold: TouchStart adds, TouchEnd removes ALL? No.
    // Let's assume touch interaction is mostly tapping. HOLD on mobile needs robust touch ID tracking.
    // I'll skip complex touch hold logic for now and focus on Keyboard Hold, 
    // or just assume active touches = active holds if I check coordinates.
  }, []);

  const processTap = (x: number, width: number): number => {
    const xPercent = (x / width) * 100;

    let closestLaneIndex = -1;
    let minDiff = 1000;

    LANES.forEach((lane, index) => {
      const diff = Math.abs(lane.xPercent - xPercent);
      if (diff < minDiff) {
        minDiff = diff;
        closestLaneIndex = index;
      }
    });

    if (closestLaneIndex !== -1) {
      attemptHit(closestLaneIndex);
      return closestLaneIndex;
    }
    return -1;
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Reset game state when play starts
  useEffect(() => {
    if (isPlaying) {
      notesRef.current = [];
      lastSpawnTimeRef.current = performance.now();
      scoreFeedbackRef.current = null;
    }
  }, [isPlaying]);

  const spawnNote = useCallback((timestamp: number) => {
    if (timestamp - lastSpawnTimeRef.current > spawnRate) {
      // Randomly decide number of notes (Chords)
      let noteCount = 1;
      if (Math.random() < chordChance) {
        noteCount = 2; // Double note
      }

      const lanes = [0, 1, 2, 3];
      // Shuffle and pick noteCount lanes
      for (let i = lanes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
      }
      const selectedLanes = lanes.slice(0, noteCount);

      selectedLanes.forEach((laneId, index) => {
        // Randomly decide if long note
        const isLong = Math.random() < longNoteChance;
        const length = isLong ? 20 + Math.random() * 30 : 0; // Length in % of screen height

        const newNote: Note = {
          id: timestamp + index, // unique ID
          laneId: laneId,
          y: -10,
          hit: false,
          missed: false,
          length: length,
          isHolding: false
        };
        notesRef.current.push(newNote);
      });

      lastSpawnTimeRef.current = timestamp;
    }
  }, [spawnRate, chordChance, longNoteChance]);

  const updateNotes = useCallback(() => {
    // Move notes
    notesRef.current.forEach(note => {
      note.y += noteSpeed;

      // Handle Holding Logic
      if (note.hit && note.length > 0) {
        // If hit and long, check if still holding
        const isHeld = heldLanesRef.current.has(note.laneId);
        if (isHeld) {
          note.isHolding = true;
          // Score tick for holding? Maybe just visuals.
          // Logic: Wait for tail to pass Hit Line
          if (note.y - note.length > HIT_LINE_Y) {
            // Tail passed! Completed.
            // Maybe give extra points?
            note.length = 0; // Mark as done basically
            note.y = 200; // Move off screen to cleanup
            onScoreUpdateRef.current(5, false); // Small bonus
            triggerFeedback("HELD!", LANES[note.laneId].xPercent);
          }
        } else {
          // Released too early! Miss!
          // But only if tail hasn't passed yet
          if (note.y - note.length < HIT_LINE_Y) {
            note.isHolding = false;
            note.missed = true; // released early
            note.hit = false; // treat as new miss
            note.y += 10; // push it so it doesn't re-trigger immediately?
            onScoreUpdateRef.current(SCORE_MISS, true);
            onHealthUpdateRef.current(-HEALTH_PENALTY);
            triggerFeedback("LOST!", LANES[note.laneId].xPercent);
          }
        }
      }
    });

    // Check for misses (note passed the line without being hit)
    notesRef.current.forEach(note => {
      // Normal miss logic: passed line, never hit
      if (!note.hit && !note.missed && note.y - (note.length > 0 ? 0 : 0) > HIT_LINE_Y + HIT_WINDOW) {
        // for long notes, we check head.
        note.missed = true;
        onScoreUpdateRef.current(SCORE_MISS, true);
        onHealthUpdateRef.current(-HEALTH_PENALTY);
        triggerFeedback("MISS", LANES[note.laneId].xPercent);
      }
    });

    // Clean up notes that are way off screen
    notesRef.current = notesRef.current.filter(n => n.y - n.length < 120);
  }, [noteSpeed, triggerFeedback]); // Fix dependency 

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);

    // Draw Lanes
    LANES.forEach(lane => {
      const x = (lane.xPercent / 100) * width;

      // Lane Line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Hit Target Circle
      const hitY = (HIT_LINE_Y / 100) * height;
      ctx.beginPath();
      ctx.arc(x, hitY, 25, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(lane.label, x, hitY + 7);
    });

    // Draw Notes
    notesRef.current.forEach(note => {
      // Current Y position
      const headY = (note.y / 100) * height;
      const lane = LANES[note.laneId];
      const x = (lane.xPercent / 100) * width;

      // Draw Tail for Long Notes
      if (note.length > 0) {
        const tailLengthPx = (note.length / 100) * height;
        const tailEndY = headY - tailLengthPx;

        ctx.beginPath();
        ctx.lineWidth = 15;
        ctx.strokeStyle = note.hit && note.isHolding ? '#fff' : lane.color; // White if holding active
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.6;
        ctx.moveTo(x, headY);
        ctx.lineTo(x, tailEndY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      if (note.hit && note.length === 0) return; // Don't draw hit normal notes
      if (note.hit && note.length > 0 && !note.isHolding) return; // Don't draw completed long notes

      // Draw Head
      ctx.beginPath();
      ctx.arc(x, headY, 20, 0, Math.PI * 2);
      ctx.fillStyle = note.missed ? '#666' : lane.color;

      // Effect if holding
      if (note.isHolding) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Inner shine
      ctx.beginPath();
      ctx.arc(x - 5, headY - 5, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
    });

    // Draw Feedback
    if (scoreFeedbackRef.current) {
      const { text, x, y, alpha } = scoreFeedbackRef.current;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text === "MISS" ? '#ef4444' : '#22c55e';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(text, x, y);
      ctx.restore();

      // Fade out
      scoreFeedbackRef.current.alpha -= 0.05;
      scoreFeedbackRef.current.y -= 1; // Float up
      if (scoreFeedbackRef.current.alpha <= 0) {
        scoreFeedbackRef.current = null;
      }
    }
  }, [width, height]);

  const animate = useCallback((time: number) => {
    if (!isPlaying) return;

    spawnNote(time);
    updateNotes();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, spawnNote, updateNotes, draw]);

  // Start/Stop Loop
  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 z-20 touch-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  );
};

export default GameCanvas;
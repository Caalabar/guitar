import React, { useRef, useEffect, useCallback } from 'react';
import { LANES, HIT_LINE_Y, NOTE_SPEED, SPAWN_RATE_MS, HIT_WINDOW, SCORE_HIT, SCORE_MISS, HEALTH_PENALTY, HEALTH_GAIN } from '../constants';
import { Note } from '../types';

interface GameCanvasProps {
  isPlaying: boolean;
  onScoreUpdate: (scoreDelta: number, comboReset: boolean) => void;
  onHealthUpdate: (delta: number) => void;
  width: number;
  height: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ isPlaying, onScoreUpdate, onHealthUpdate, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const notesRef = useRef<Note[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const scoreFeedbackRef = useRef<{ text: string, x: number, y: number, alpha: number } | null>(null);

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
    if (!isPlaying) return;

    const laneIndex = LANES.findIndex(l => l.key === e.key.toLowerCase());
    if (laneIndex !== -1) {
      attemptHit(laneIndex);
    }
  }, [isPlaying, attemptHit]);

  // Touch/Click handling
  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaying) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    
    if ('touches' in e) {
        if (e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        } else {
            return;
        }
    } else {
        clientX = (e as React.MouseEvent).clientX;
    }
    
    const x = clientX - rect.left;
    const xPercent = (x / rect.width) * 100;

    // Find closest lane based on click position
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
    }
  }, [isPlaying, attemptHit]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset game state when play starts
  useEffect(() => {
    if (isPlaying) {
      notesRef.current = [];
      lastSpawnTimeRef.current = performance.now();
      scoreFeedbackRef.current = null;
    }
  }, [isPlaying]);

  const spawnNote = useCallback((timestamp: number) => {
    if (timestamp - lastSpawnTimeRef.current > SPAWN_RATE_MS) {
      // Create a random note
      const randomLane = Math.floor(Math.random() * 4);
      const newNote: Note = {
        id: timestamp,
        laneId: randomLane,
        y: -10, // Start slightly above screen
        hit: false,
        missed: false
      };
      notesRef.current.push(newNote);
      lastSpawnTimeRef.current = timestamp;
    }
  }, []);

  const updateNotes = useCallback(() => {
    // Move notes
    notesRef.current.forEach(note => {
      note.y += NOTE_SPEED;
    });

    // Check for misses (note passed the line without being hit)
    notesRef.current.forEach(note => {
      if (!note.hit && !note.missed && note.y > HIT_LINE_Y + HIT_WINDOW) {
        note.missed = true;
        onScoreUpdateRef.current(SCORE_MISS, true);
        onHealthUpdateRef.current(-HEALTH_PENALTY);
        triggerFeedback("MISS", LANES[note.laneId].xPercent);
      }
    });

    // Clean up notes that are way off screen
    notesRef.current = notesRef.current.filter(n => n.y < 120);
  }, [triggerFeedback]);

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
      if (note.hit) return; // Don't draw hit notes
      
      const lane = LANES[note.laneId];
      const x = (lane.xPercent / 100) * width;
      const y = (note.y / 100) * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fillStyle = note.missed ? '#666' : lane.color;
      ctx.fill();
      
      // Inner shine
      ctx.beginPath();
      ctx.arc(x - 5, y - 5, 8, 0, Math.PI * 2);
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
        onMouseDown={handleInteraction}
        onTouchStart={handleInteraction}
    />
  );
};

export default GameCanvas;
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import YouTubePlayer from './components/YouTubePlayer';
import { MAX_HEALTH, YOUTUBE_VIDEO_ID, DIFFICULTY_SETTINGS } from './constants';
import { GameStatus, DifficultyLevel } from './types';

// Helper to extract ID from various YouTube URL formats
const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

function App() {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Game State
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [playerReady, setPlayerReady] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);

  // Video State
  const [currentVideoId, setCurrentVideoId] = useState(YOUTUBE_VIDEO_ID);
  const [urlInput, setUrlInput] = useState('');

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Failsafe timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!playerReady && status === GameStatus.MENU) {
        // Only log, don't force true if there might be a real error
        console.log("Player taking a while...");
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [playerReady, status]);

  const startGame = () => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHealth(MAX_HEALTH);
    setStatus(GameStatus.PLAYING);
  };

  const endGame = () => {
    setStatus(GameStatus.GAME_OVER);
  };

  const handleScoreUpdate = (delta: number, resetCombo: boolean) => {
    setScore(prev => prev + delta);
    if (resetCombo) {
      setCombo(0);
    } else {
      setCombo(prev => {
        const newCombo = prev + 1;
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        return newCombo;
      });
    }
  };

  useEffect(() => {
    if (combo > maxCombo) setMaxCombo(combo);
  }, [combo, maxCombo]);

  const handleHealthUpdate = (delta: number) => {
    setHealth(prev => {
      const newHealth = Math.min(MAX_HEALTH, Math.max(0, prev + delta));
      if (newHealth <= 0 && status === GameStatus.PLAYING) {
        setTimeout(() => endGame(), 0);
      }
      return newHealth;
    });
  };

  const handleVideoEnd = () => {
    if (status === GameStatus.PLAYING) {
      endGame();
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extractedId = extractVideoId(urlInput);
    if (extractedId) {
      setCurrentVideoId(extractedId);
      setPlayerReady(false);
      setUrlInput('');
    } else {
      alert("Invalid YouTube URL");
    }
  };

  const loadDemoSong = () => {
    setCurrentVideoId(YOUTUBE_VIDEO_ID);
    setPlayerReady(false);
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden font-sans select-none">

      {/* Background visual flair since video is no longer bg */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black opacity-50 z-0"></div>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>

      {/* Video Player - Top Right Corner */}
      <div className="absolute top-4 right-4 z-40 w-80 aspect-video transition-all duration-500 hover:scale-105">
        <YouTubePlayer
          videoId={currentVideoId}
          isPlaying={status === GameStatus.PLAYING}
          onEnded={handleVideoEnd}
          setPlayerReady={setPlayerReady}
        />
        <div className="mt-1 text-right flex justify-end items-center gap-2">
          {!playerReady && <span className="text-[10px] text-gray-400 animate-pulse">Initializing...</span>}
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${playerReady ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {playerReady ? 'READY' : 'WAITING'}
          </span>
        </div>
      </div>

      {/* Game Layer: Canvas */}
      <GameCanvas
        isPlaying={status === GameStatus.PLAYING}
        onScoreUpdate={handleScoreUpdate}
        onHealthUpdate={handleHealthUpdate}
        width={dimensions.width}
        height={dimensions.height}
        noteSpeed={DIFFICULTY_SETTINGS[difficulty].noteSpeed}
        spawnRate={DIFFICULTY_SETTINGS[difficulty].spawnRate}
        chordChance={DIFFICULTY_SETTINGS[difficulty].chordChance}
        longNoteChance={DIFFICULTY_SETTINGS[difficulty].longNoteChance}
      />

      {/* UI Layer: HUD */}
      {status === GameStatus.PLAYING && (
        <div className="absolute top-0 left-0 w-full p-6 z-30 flex justify-between items-start text-white pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="text-4xl font-black italic tracking-tighter" style={{ textShadow: '0 0 10px #fff' }}>
              {score.toLocaleString()}
            </div>
            <div className="text-xl text-yellow-400 font-bold">
              {combo > 1 ? `${combo}x COMBO` : ''}
            </div>
          </div>

          <div className="w-64 mr-[340px]"> {/* Margin right to avoid overlapping the video */}
            <div className="flex justify-between text-sm font-bold mb-1">
              <span>ROCK METER</span>
              <span className={health < 30 ? "text-red-500 animate-pulse" : "text-green-400"}>
                {Math.round(health)}%
              </span>
            </div>
            <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
              <div
                className={`h-full transition-all duration-200 ${health > 50 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                  health > 20 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                    'bg-gradient-to-r from-red-600 to-red-400'
                  }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Menus Overlay */}
      {status !== GameStatus.PLAYING && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">

            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2 italic transform -skew-x-6">
              GUITARRETO
            </h1>
            <p className="text-gray-400 mb-6 text-sm">WEB EDITION</p>

            {/* Fixed Song Mode - No Input */}
            <div className="mb-6 bg-gray-800 p-3 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-300 font-bold mb-1">
                Playing: <span className="text-purple-400">Locked Song</span>
              </div>
            </div>

            {status === GameStatus.MENU && (
              <>

                {/* Difficulty Selector */}
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-widest">Select Difficulty</div>
                  <div className="flex justify-center gap-2">
                    {(Object.keys(DifficultyLevel) as Array<keyof typeof DifficultyLevel>).map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(DifficultyLevel[level])}
                        className={`px-3 py-1 text-xs font-bold rounded border transition-all ${difficulty === DifficultyLevel[level]
                          ? `bg-white text-black border-white scale-110 shadow-lg ${DIFFICULTY_SETTINGS[DifficultyLevel[level]].color.replace('text-', 'shadow-')}/50`
                          : 'bg-black/50 text-gray-500 border-gray-700 hover:border-gray-500'
                          }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-gray-300 mb-6 text-sm">
                  Controls: <span className="text-green-400 font-bold">A</span> <span className="text-red-400 font-bold">S</span> <span className="text-yellow-400 font-bold">J</span> <span className="text-blue-400 font-bold">K</span>
                </p>
                {playerReady ? (
                  <button
                    onClick={startGame}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg text-xl transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-green-900/50"
                  >
                    START ROCKING
                  </button>
                ) : (
                  <div className="text-yellow-500 font-mono text-sm bg-yellow-900/20 p-2 rounded">
                    Waiting for Video...
                  </div>
                )}
              </>
            )}

            {status === GameStatus.GAME_OVER && (
              <>
                <h2 className="text-3xl font-bold text-white mb-2">SESSION OVER</h2>
                <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-800 p-4 rounded-lg">
                  <div className="text-right border-r border-gray-600 pr-4">
                    <div className="text-xs text-gray-400 uppercase">Score</div>
                    <div className="text-2xl font-bold text-white">{score.toLocaleString()}</div>
                  </div>
                  <div className="text-left pl-4">
                    <div className="text-xs text-gray-400 uppercase">Best Combo</div>
                    <div className="text-2xl font-bold text-yellow-400">{maxCombo}</div>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  PLAY AGAIN
                </button>

              </>
            )}

          </div>
        </div>
      )}

      {/* Bottom Hit Line */}
      {status === GameStatus.PLAYING && (
        <div className="absolute bottom-[15%] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent z-10 pointer-events-none"></div>
      )}
    </div>
  );
}

export default App;
import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  onEnded: () => void;
  setPlayerReady: (ready: boolean) => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, isPlaying, onEnded, setPlayerReady }) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load YouTube API if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    function initializePlayer() {
      if (playerRef.current) {
        return;
      }

      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          'playsinline': 1,
          'controls': 0,
          'disablekb': 1,
          'rel': 0,
          'modestbranding': 1,
          'origin': window.location.origin
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for Video ID changes
  useEffect(() => {
    if (playerRef.current && playerRef.current.loadVideoById && videoId) {
      setErrorMsg(null); // Clear previous errors
      setPlayerReady(false);
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId, setPlayerReady]);

  // Playback control
  useEffect(() => {
    if (playerRef.current && playerRef.current.playVideo && !errorMsg) {
      if (isPlaying) {
        if (typeof playerRef.current.unMute === 'function') {
          playerRef.current.unMute();
        }
        if (typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(100);
        }
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
        if (!isPlaying) {
          playerRef.current.seekTo(0);
        }
      }
    }
  }, [isPlaying, errorMsg]);

  const onPlayerReady = (event: any) => {
    setErrorMsg(null);
    setPlayerReady(true);
    if (event.target && typeof event.target.unMute === 'function') {
      event.target.unMute();
      event.target.setVolume(100);
    }
  };

  const onPlayerStateChange = (event: any) => {
    // If Video is Cued (5), Playing (1), or Paused (2), we consider it ready to start
    if (event.data === 1 || event.data === 2 || event.data === 5 || event.data === -1) {
      setPlayerReady(true);
    }

    if (event.data === 0) { // ENDED
      onEnded();
    }
  };

  const onPlayerError = (event: any) => {
    console.error("YouTube Player Error Code:", event.data);
    let msg = "Error loading video.";
    if (event.data === 150 || event.data === 101) {
      msg = "Playback Blocked by Owner. Try another video.";
    } else if (event.data === 100) {
      msg = "Video not found.";
    }
    setErrorMsg(msg);
    setPlayerReady(false); // Prevents game start
  };

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-lg overflow-hidden bg-black shadow-xl border-2 border-gray-800 group">
      <div id="youtube-player" className="w-full h-full"></div>

      {/* Error Overlay */}
      {errorMsg && (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center p-4 text-center z-50">
          <span className="text-red-500 text-3xl mb-2">⚠️</span>
          <p className="text-red-400 font-bold text-sm">{errorMsg}</p>
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer;
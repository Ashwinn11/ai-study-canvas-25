'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brainBotService } from '@/lib/api/brainBotService';
import { toast } from 'sonner';
import Image from 'next/image';
import { logger } from '@/utils/logger';

interface BrainBotPlayerProps {
  materialId: string;
  content: string;
  title: string;
}

interface ScriptLine {
  speaker: 'Alex' | 'Jordan';
  text: string;
  audioUrl?: string;
}

export default function BrainBotPlayer({ materialId, content, title }: BrainBotPlayerProps) {
  const router = useRouter();
  const [script, setScript] = useState<ScriptLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Alex is reading your notes... 🤓");
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Ref to track current audio source URL (prevents restart on script updates)
  const currentSourceUrlRef = useRef<string | null>(null);

  // Cycle loading messages
  useEffect(() => {
    if (!isLoading) return;

    const messages = [
      "Alex is reading your notes... 🤓",
      "Jordan is fact-checking the receipts... 🧐",
      "Cooking up a script... 🍳",
      "Warming up the mics... 🎙️",
      "Getting ready to spill the tea... ☕"
    ];

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Generate podcast with audio on mount
  useEffect(() => {
    generatePodcast();
  }, []);

  // Auto-advance to next segment when current finishes
  useEffect(() => {
    if (!audioRef.current) return;

    const handleEnded = () => {
      if (currentSegmentIndex < script.length - 1) {
        setCurrentSegmentIndex(currentSegmentIndex + 1);
      } else {
        setIsPlaying(false);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    const audio = audioRef.current;
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentSegmentIndex, script.length]);

  // Load new segment when index changes
  useEffect(() => {
    if (script[currentSegmentIndex]?.audioUrl && audioRef.current) {
      const newSourceUrl = script[currentSegmentIndex].audioUrl!;
      
      // CRITICAL FIX: Only update player if source actually changes
      // Appending to script triggers this effect, but sourceUrl remains same for current index
      if (currentSourceUrlRef.current === newSourceUrl) {
        return;
      }
      
      currentSourceUrlRef.current = newSourceUrl;
      audioRef.current.src = newSourceUrl;
      
      // Preload next segment for gapless playback (like iOS)
      const nextSegment = script[currentSegmentIndex + 1];
      if (nextSegment?.audioUrl) {
        // Create hidden audio element to preload next segment
        const preloadAudio = new Audio(nextSegment.audioUrl);
        preloadAudio.preload = 'auto';
        preloadAudio.load();
      }
      
      if (isPlaying) {
        audioRef.current.play().catch((error) => {
          // Suppress AbortError - it's expected when switching segments
          if (error.name !== 'AbortError') {
            logger.error('[BrainBot] Audio playback error:', error);
          }
        });
      }
    }
  }, [currentSegmentIndex, script, isPlaying]);

  const generatePodcast = async () => {
    try {
      setIsLoading(true);
      let segmentCount = 0;
      
      // Try to use audio generation with streaming
      try {
        const result = await brainBotService.generatePodcastWithAudio(
          materialId,
          content,
          (segment) => {
            // Stream segments as they're generated (only for new podcasts)
            segmentCount++;
            setScript(prev => [...prev, {
              speaker: segment.speaker,
              text: segment.text,
              audioUrl: segment.url,
            }]);
            
            // Start playing after first 4 segments (buffered playback)
            if (segmentCount === 4) {
              setIsLoading(false);
              setIsPlaying(true);
            }
          }
        );
        
        // If we got a result with script (cached), set it directly
        if (result.script && result.script.length > 0) {
          setScript(result.script);
          setIsLoading(false);
        }
      } catch (audioError) {
        // If audio generation fails, fall back to script-only mode
        logger.warn('[BrainBot] Audio generation failed, using script-only mode:', audioError);
        const scriptLines = await brainBotService.generatePodcastScript(content, 'supportive');
        setScript(scriptLines);
      }
      
      setIsLoading(false);
    } catch (error) {
      logger.error('[BrainBot] Error generating podcast:', error);
      toast.error('Failed to generate podcast. Please try again.');
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => logger.error('[BrainBot] Play error:', error));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    if (currentSegmentIndex > 0) {
      setCurrentSegmentIndex(currentSegmentIndex - 1);
    }
  };

  const handleSkipForward = () => {
    if (currentSegmentIndex < script.length - 1) {
      setCurrentSegmentIndex(currentSegmentIndex + 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSpeaker = script[currentSegmentIndex]?.speaker;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[600px] px-6">
          {/* Dual Avatar Loading */}
          <div className="flex gap-8 mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500/30 animate-pulse">
                <Image
                  src="/brainbot-alex.png"
                  alt="Alex"
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
            </div>
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-green-500/30 animate-pulse">
                <Image
                  src="/brainbot-jordan.png"
                  alt="Jordan"
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Loading Spinner */}
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>

          {/* Loading Message */}
          <p className="text-xl text-center mb-2">{loadingMessage}</p>
          <p className="text-sm text-gray-400 text-center max-w-md">
            This usually takes ~15 seconds.
            <br />
            Don't close the tab!
          </p>
        </div>
      )}

      {/* Podcast Player */}
      {!isLoading && script.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Dual Avatar Visualizer */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex gap-12 mb-8 relative">
              {/* Alex Avatar */}
              <div className="relative flex flex-col items-center">
                {currentSpeaker === 'Alex' && isPlaying && (
                  <>
                    <div className="absolute inset-0 w-32 h-32 rounded-full bg-blue-500/30 animate-ping"></div>
                    <div className="absolute inset-0 w-32 h-32 rounded-full bg-blue-500/20 animate-pulse"></div>
                  </>
                )}
                <div
                  className={`w-32 h-32 rounded-full overflow-hidden transition-all duration-300 ${
                    currentSpeaker === 'Alex'
                      ? 'scale-110 ring-4 ring-blue-400 shadow-lg shadow-blue-500/50'
                      : 'scale-90 opacity-60'
                  }`}
                >
                  <Image
                    src="/brainbot-alex.png"
                    alt="Alex"
                    width={128}
                    height={128}
                    className="object-cover"
                  />
                </div>
                <div className="mt-2 px-3 py-1 bg-blue-500 rounded-full text-xs font-bold">
                  Alex
                </div>
              </div>

              {/* Jordan Avatar */}
              <div className="relative flex flex-col items-center">
                {currentSpeaker === 'Jordan' && isPlaying && (
                  <>
                    <div className="absolute inset-0 w-32 h-32 rounded-full bg-green-500/30 animate-ping"></div>
                    <div className="absolute inset-0 w-32 h-32 rounded-full bg-green-500/20 animate-pulse"></div>
                  </>
                )}
                <div
                  className={`w-32 h-32 rounded-full overflow-hidden transition-all duration-300 ${
                    currentSpeaker === 'Jordan'
                      ? 'scale-110 ring-4 ring-green-400 shadow-lg shadow-green-500/50'
                      : 'scale-90 opacity-60'
                  }`}
                >
                  <Image
                    src="/brainbot-jordan.png"
                    alt="Jordan"
                    width={128}
                    height={128}
                    className="object-cover"
                  />
                </div>
                <div className="mt-2 px-3 py-1 bg-green-500 rounded-full text-xs font-bold">
                  Jordan
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-center mb-2">{title}</h1>
            <p className="text-gray-400 text-center mb-4">with BrainBot (Alex & Jordan)</p>
            {script.length > 1 && (
              <div className="px-4 py-2 bg-white/10 rounded-full text-sm">
                Segment {currentSegmentIndex + 1} of {script.length}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Hidden Audio Element */}
          <audio ref={audioRef} preload="auto" />

          {/* Play Controls */}
          <div className="flex items-center justify-center gap-8 mb-12">
            <Button
              variant="ghost"
              size="lg"
              onClick={handleSkipBack}
              disabled={currentSegmentIndex === 0}
              className="text-white hover:bg-white/10"
            >
              <SkipBack className="h-6 w-6" />
            </Button>

            <Button
              size="lg"
              onClick={togglePlayPause}
              disabled={!script[currentSegmentIndex]?.audioUrl}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
            >
              {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 ml-1" />}
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={handleSkipForward}
              disabled={currentSegmentIndex === script.length - 1}
              className="text-white hover:bg-white/10"
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>

          {/* Chat-Style Transcript */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Transcript</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {script.map((line, index) => {
                const isAlex = line.speaker === 'Alex';
                return (
                  <div
                    key={index}
                    className={`flex gap-3 ${isAlex ? 'flex-row' : 'flex-row-reverse'} ${
                      index === currentSegmentIndex ? 'opacity-100' : 'opacity-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ${
                        isAlex
                          ? 'ring-2 ring-blue-500/50'
                          : 'ring-2 ring-green-500/50'
                      }`}
                    >
                      <Image
                        src={isAlex ? '/brainbot-alex.png' : '/brainbot-jordan.png'}
                        alt={isAlex ? 'Alex' : 'Jordan'}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        isAlex
                          ? 'bg-white/10 rounded-bl-sm'
                          : 'bg-gradient-to-r from-blue-500/20 to-green-500/20 rounded-br-sm'
                      }`}
                    >
                      <p
                        className={`text-xs font-bold mb-1 opacity-80 ${
                          isAlex ? 'text-blue-400' : 'text-green-400 text-right'
                        }`}
                      >
                        {line.speaker}
                      </p>
                      <p className="text-base leading-relaxed">{line.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

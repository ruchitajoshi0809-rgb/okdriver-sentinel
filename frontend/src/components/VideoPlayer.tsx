"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { AlertCircle, RefreshCw, Radio } from "lucide-react";

export const DEFAULT_FALLBACK_STREAM_URL =
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8";

export const ERROR_STREAM_UNAVAILABLE =
  "Stream unavailable – check stream_url or network";

export interface VideoPlayerProps {
  streamUrl: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  fallbackUrl?: string;
  enableAutoFallback?: boolean;
}

export default function VideoPlayer({
  streamUrl,
  title,
  autoPlay = true,
  muted = true,
  controls = true,
  className = "",
  fallbackUrl = DEFAULT_FALLBACK_STREAM_URL,
  enableAutoFallback = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [activeUrl, setActiveUrl] = useState<string>(streamUrl || fallbackUrl);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Sync state when streamUrl prop changes
  useEffect(() => {
    if (streamUrl && streamUrl.trim().length > 0) {
      setActiveUrl(streamUrl.trim());
      setIsUsingFallback(false);
    } else if (enableAutoFallback && fallbackUrl) {
      setActiveUrl(fallbackUrl.trim());
      setIsUsingFallback(true);
    } else {
      setActiveUrl("");
      setIsUsingFallback(false);
    }
    setError(null);
    setLoading(true);
    setIsPlaying(false);
    setReloadKey((prev) => prev + 1);
  }, [streamUrl, fallbackUrl, enableAutoFallback]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setIsPlaying(false);
    // Retry with primary streamUrl first if available
    if (streamUrl && streamUrl.trim().length > 0) {
      setActiveUrl(streamUrl.trim());
      setIsUsingFallback(false);
    }
    setReloadKey((prev) => prev + 1);
  }, [streamUrl]);

  const handleUseDemo = useCallback(() => {
    setError(null);
    setLoading(true);
    setIsPlaying(false);
    setActiveUrl(fallbackUrl);
    setIsUsingFallback(true);
    setReloadKey((prev) => prev + 1);
  }, [fallbackUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!activeUrl || activeUrl.trim() === "") {
      setError(ERROR_STREAM_UNAVAILABLE);
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const cleanUrl = activeUrl.trim();
    const isM3U8 = cleanUrl.toLowerCase().split(/[?#]/)[0].endsWith(".m3u8");

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onWaiting = () => setIsPlaying(false);

    video.addEventListener("playing", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("waiting", onWaiting);

    const triggerFallbackOrError = () => {
      // If we are not yet using the fallback and auto fallback is enabled, switch to demo stream
      if (
        enableAutoFallback &&
        !isUsingFallback &&
        fallbackUrl &&
        cleanUrl !== fallbackUrl
      ) {
        setIsUsingFallback(true);
        setActiveUrl(fallbackUrl);
        setReloadKey((prev) => prev + 1);
      } else {
        setError(ERROR_STREAM_UNAVAILABLE);
        setLoading(false);
        setIsPlaying(false);
      }
    };

    if (isM3U8) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
        });
        hlsRef.current = hls;

        hls.loadSource(cleanUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          if (autoPlay) {
            video.play().catch(() => {
              // Autoplay policy prevented playback, user can use controls
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.destroy();
                hlsRef.current = null;
                triggerFallbackOrError();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                hlsRef.current = null;
                triggerFallbackOrError();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native Apple HLS (Safari iOS/macOS)
        video.src = cleanUrl;

        const onLoadedMetadata = () => {
          setLoading(false);
          if (autoPlay) {
            video.play().catch(() => {});
          }
        };

        const onError = () => {
          triggerFallbackOrError();
        };

        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("error", onError);

        return () => {
          video.removeEventListener("playing", onPlay);
          video.removeEventListener("pause", onPause);
          video.removeEventListener("ended", onEnded);
          video.removeEventListener("waiting", onWaiting);
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.removeEventListener("error", onError);
        };
      } else {
        triggerFallbackOrError();
      }
    } else {
      // Normal HTML5 video source (e.g. MP4, WebM)
      video.src = cleanUrl;

      const onLoadedData = () => {
        setLoading(false);
        if (autoPlay) {
          video.play().catch(() => {});
        }
      };

      const onError = () => {
        triggerFallbackOrError();
      };

      video.addEventListener("loadeddata", onLoadedData);
      video.addEventListener("error", onError);

      return () => {
        video.removeEventListener("playing", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("error", onError);
      };
    }

    return () => {
      video.removeEventListener("playing", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("waiting", onWaiting);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [activeUrl, autoPlay, reloadKey, isUsingFallback, enableAutoFallback, fallbackUrl]);

  return (
    <div
      className={`relative aspect-video w-full bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-inner group ${className}`}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        muted={muted}
        controls={controls}
      />

      {/* Top Banner: Title & Badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10 gap-2">
        <div className="flex items-center gap-2 max-w-[70%]">
          {title && (
            <div className="bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs font-medium tracking-wide truncate border border-white/10 shadow">
              {title}
            </div>
          )}
          {isUsingFallback && (
            <div className="hidden sm:inline-flex items-center gap-1 bg-amber-500/90 text-slate-950 font-semibold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase shadow">
              <Radio className="w-3 h-3" />
              Demo Fallback
            </div>
          )}
        </div>

        {/* LIVE badge displayed ONLY when stream is playing */}
        {isPlaying && !error && (
          <div className="flex items-center gap-1.5 bg-red-600/95 text-white px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase shadow-lg border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs text-white z-20 pointer-events-none">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-300 font-medium tracking-wide">
            {isUsingFallback ? "Connecting to demo feed..." : "Connecting to stream..."}
          </p>
        </div>
      )}

      {/* Clear Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm text-white p-6 z-30 text-center">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/30 flex items-center justify-center mb-3 text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-100 mb-1">
            Stream Unavailable
          </h4>
          <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed font-mono">
            {error}
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 hover:border-slate-600 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Stream
            </button>
            {!isUsingFallback && (
              <button
                type="button"
                onClick={handleUseDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                Play Demo CCTV Stream
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

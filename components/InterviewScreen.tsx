import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { InterviewConfig, InterviewResult, TranscriptEntry } from '../types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio-utils';
import { Mic, StopCircle, Clock, Wifi, Activity, AlertCircle, Phone, Mail, CheckCircle, FileText } from 'lucide-react';

interface InterviewScreenProps {
  config: InterviewConfig;
  onComplete: (result: InterviewResult) => void;
}

const API_KEY = process.env.API_KEY || ''; 

export const InterviewScreen: React.FC<InterviewScreenProps> = ({ config, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes strict
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [showContactOverlay, setShowContactOverlay] = useState(false);
  
  // Transcription State
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // GenAI Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Connection & Retry Refs
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 5;
  const isIntentionalCloseRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<any>(null);

  // Transcription Refs (Buffers)
  const currentInputTransRef = useRef<string>("");
  const currentOutputTransRef = useRef<string>("");

  // Silence & Interaction Logic
  const lastUserSpeechTimeRef = useRef<number>(Date.now());
  const isAiSpeakingRef = useRef<boolean>(false);
  const silenceCheckIntervalRef = useRef<any>(null);
  const strikeCountRef = useRef<number>(0);
  const interruptionCountRef = useRef<number>(0);

  const notifyResultFunc: FunctionDeclaration = {
    name: 'notifyResult',
    description: 'Call this function ONLY AFTER you have verbally informed the candidate of the decision. This terminates the session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        passed: {
          type: Type.BOOLEAN,
          description: 'True if candidate passed, False if failed.',
        },
        reason: {
          type: Type.STRING,
          description: 'A professional justification for the decision.',
        }
      },
      required: ['passed', 'reason'],
    },
  };

  useEffect(() => {
    let timer: any;
    if (isConnected && timeLeft > 0 && !showContactOverlay) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
        handleEndSession(false, "Interview time limit of 5 minutes exceeded.");
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, timeLeft, showContactOverlay]);

  useEffect(() => {
    startSession();
    return () => cleanupSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silence Monitor Loop
  useEffect(() => {
    if (isConnected) {
        silenceCheckIntervalRef.current = setInterval(() => {
            if (isIntentionalCloseRef.current) return;

            const timeSinceLastSpeech = Date.now() - lastUserSpeechTimeRef.current;
            
            if (timeSinceLastSpeech > 8000 && !isAiSpeakingRef.current) {
                strikeCountRef.current += 1;
                const strikes = strikeCountRef.current;
                
                lastUserSpeechTimeRef.current = Date.now(); 

                if (strikes >= 3) {
                     console.log("Strike 3: Failing candidate.");
                     sessionPromiseRef.current?.then(session => {
                         session.send({
                             parts: [{ text: "[SYSTEM COMMAND: The candidate has been unresponsive for 3 consecutive attempts. THIS IS THE FINAL STRIKE. You MUST FAIL them now. Say 'I am not receiving any response. I must end the interview now.' and immediately call notifyResult(false, 'Candidate unresponsive regarding network/audio issues').]" }]
                         });
                     });
                } else {
                    console.log(`Strike ${strikes}: Warning candidate.`);
                    sessionPromiseRef.current?.then(session => {
                        session.send({
                            parts: [{ text: `[SYSTEM NOTIFICATION: The candidate has been silent for 8+ seconds. Strike ${strikes}/3. Politely ask: 'Can you hear me? Is there a network issue?']` }]
                        });
                    });
                }
            }
        }, 1000);
    }
    return () => clearInterval(silenceCheckIntervalRef.current);
  }, [isConnected]);

  const cleanupSession = () => {
    isIntentionalCloseRef.current = true; // Prevent retries
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }
    if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
    }
    
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    clearInterval(silenceCheckIntervalRef.current);
  };

  const handleEndSession = (passed: boolean, reason?: string) => {
    if (passed && !showContactOverlay) {
        setShowContactOverlay(true);
        setTimeout(() => {
            finalizeSession(passed, reason);
        }, 10000); 
    } else {
        finalizeSession(passed, reason);
    }
  };

  const finalizeSession = (passed: boolean, reason?: string) => {
    cleanupSession();
    onComplete({ passed, notes: reason, transcript: transcript });
  };

  const connectToGemini = () => {
    if (isIntentionalCloseRef.current) return;

    const ai = new GoogleGenAI({ apiKey: API_KEY });
      
    const sysInstruction = `
      Role: You are Sarah, a very experienced Senior Technical Recruiter for Cehpoint.
      Goal: Conduct a structured, rigorous interview with ${config.name} for the ${config.role} position.
      Language: Speak in ${config.language}.
      
      DYNAMIC ASSESSMENT INSTRUCTIONS:
      1. **Do NOT be static**: Do not just read questions from a list.
      2. **Validate Answers**: If the candidate answers a technical question, ask a follow-up to VALIDATE their knowledge. 
          - Example: If they say "I know React", ask "How does the Reconciliation algorithm work?" or "Explain useEffect dependencies."
          - Example: If they say "I handled a crisis", ask "What was the specific message you posted first?"
      3. **Spot Bluffing**: If the answer is vague or generic, press them for specific examples.
      
      Company Details:
      - CEO: Mr. Banerjee (Phone: 9091156095)
      - HR Email: hr@cehpoint.co.in
      
      PROTOCOL:
      - Intro (30s): Welcome & Role Check.
      - Core (3m): 2 Scenario + 1 Technical (Deep Dive).
      - Closing: Verbal feedback + Final Decision.
      
      DECISION:
      - Call 'notifyResult' ONLY after you have verbally informed them of the result.
    `;

    try {
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (isIntentionalCloseRef.current) return;
            setIsConnected(true);
            setIsReconnecting(false);
            retryCountRef.current = 0; // Reset retries on success
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (isIntentionalCloseRef.current) return;

            // --- Handle Transcription ---
            if (msg.serverContent?.outputTranscription?.text) {
                currentOutputTransRef.current += msg.serverContent.outputTranscription.text;
            }
            if (msg.serverContent?.inputTranscription?.text) {
                currentInputTransRef.current += msg.serverContent.inputTranscription.text;
            }
            
            if (msg.serverContent?.turnComplete) {
                const now = new Date().toLocaleTimeString();
                
                if (currentInputTransRef.current.trim()) {
                    setTranscript(prev => [...prev, {
                        speaker: 'user',
                        text: currentInputTransRef.current.trim(),
                        timestamp: now
                    }]);
                    currentInputTransRef.current = "";
                }
                
                if (currentOutputTransRef.current.trim()) {
                     setTranscript(prev => [...prev, {
                        speaker: 'ai',
                        text: currentOutputTransRef.current.trim(),
                        timestamp: now
                    }]);
                    currentOutputTransRef.current = "";
                }
            }

            // --- Handle Tool Calls ---
            if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                    if (fc.name === 'notifyResult') {
                        const { passed, reason } = fc.args as any;
                        sessionPromiseRef.current?.then(session => {
                            session.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: "ok" }
                                }
                            });
                        });
                        handleEndSession(passed, reason);
                    }
                }
            }

            // --- Handle Audio Output ---
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                isAiSpeakingRef.current = true; 
                const ctx = outputContextRef.current;
                if (!ctx) return;

                const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                
                source.connect(ctx.destination);
                
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        isAiSpeakingRef.current = false;
                        lastUserSpeechTimeRef.current = Date.now();
                    }
                };

                // Visualizer update
                setAiVolume(50 + Math.random() * 50);
                setTimeout(() => setAiVolume(0), audioBuffer.duration * 1000);

                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                    nextStartTimeRef.current = currentTime;
                }
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }
          },
          onclose: (e) => {
              setIsConnected(false);
              if (!isIntentionalCloseRef.current) {
                  handleRetry();
              }
          },
          onerror: (e) => {
              console.error("Connection error:", e);
              // Do not immediately set error state, wait for retry logic
              setIsReconnecting(true);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: { parts: [{ text: sysInstruction }] },
          tools: [{ functionDeclarations: [notifyResultFunc] }],
          inputAudioTranscription: { model: "google_speech_v2" },
          outputAudioTranscription: { model: "google_speech_v2" }
        }
      });
    } catch (err) {
      console.error(err);
      handleRetry();
    }
  };

  const handleRetry = () => {
    if (isIntentionalCloseRef.current) return;

    if (retryCountRef.current < MAX_RETRIES) {
        setIsReconnecting(true);
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000); // Exponential backoff capped at 10s
        retryCountRef.current += 1;
        
        console.log(`Connection lost. Retrying in ${delay}ms... (Attempt ${retryCountRef.current})`);
        
        retryTimeoutRef.current = setTimeout(() => {
            connectToGemini();
        }, delay);
    } else {
        setError("Unable to establish a stable connection. Please check your internet and reload.");
        setIsReconnecting(false);
    }
  };

  const startSession = async () => {
    isIntentionalCloseRef.current = false;
    retryCountRef.current = 0;

    try {
      // 1. Media Setup (Once)
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // CRITICAL CHECK: If component unmounted while waiting for stream, stop immediately.
        if (isIntentionalCloseRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }

      // 2. Audio Contexts (Once)
      if (!inputContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        const outputCtx = new AudioContextClass({ sampleRate: 24000 });
        
        if (isIntentionalCloseRef.current) {
            inputCtx.close();
            outputCtx.close();
            return;
        }

        inputContextRef.current = inputCtx;
        outputContextRef.current = outputCtx;

        // --- Input Analysis (Silence Detection & Barge-In) ---
        const source = inputCtx.createMediaStreamSource(streamRef.current!);
        const analyzer = inputCtx.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        
        const checkVolume = () => {
          if (!inputContextRef.current || isIntentionalCloseRef.current) return;
          
          analyzer.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setUserVolume(avg); 
          
          if (avg > 20) {
              lastUserSpeechTimeRef.current = Date.now();
              strikeCountRef.current = 0; 

              if (isAiSpeakingRef.current) {
                  sourcesRef.current.forEach(s => {
                      try { s.stop(); } catch (e) {}
                  });
                  sourcesRef.current.clear();
                  isAiSpeakingRef.current = false;
                  interruptionCountRef.current += 1;

                  if (interruptionCountRef.current >= 3) {
                      sessionPromiseRef.current?.then(session => {
                          session.send({
                              parts: [{ text: "[SYSTEM ALERT: The user has interrupted you 3 times. Sternly ask them to let you finish.]" }]
                          });
                      });
                      interruptionCountRef.current = 0;
                  }
              }
          }
          requestAnimationFrame(checkVolume);
        };
        checkVolume();

        // --- GenAI Input Processor ---
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (isIntentionalCloseRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          sessionPromiseRef.current?.then(session => {
             // Only send if session is valid and we are connected
             if (!isIntentionalCloseRef.current) {
                 session.sendRealtimeInput({ media: pcmBlob });
             }
          });
        };
        source.connect(processor);
        processor.connect(inputCtx.destination);
      }

      // 3. Connect to AI
      connectToGemini();

    } catch (err) {
      console.error(err);
      if (!isIntentionalCloseRef.current) {
        setError("Failed to initialize interview session. Microphone/Camera permission is required.");
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative border border-slate-800">
        
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className="w-full h-full object-cover" 
        />
        
        {/* Top Status Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent z-10">
           <div className="flex flex-col gap-2">
               <div className="flex items-center gap-3">
                   <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30">
                       <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                       <span className="text-white text-xs font-bold tracking-widest">LIVE TRANSCRIPT</span>
                   </div>
                   
                   {isReconnecting ? (
                        <div className="flex items-center gap-2 bg-amber-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/30 animate-pulse">
                            <Activity className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-amber-200 font-mono">RECONNECTING (Attempt {retryCountRef.current}/{MAX_RETRIES})...</span>
                        </div>
                   ) : (
                       <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                            <Wifi className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-slate-300 font-mono">SIGNAL STRONG</span>
                       </div>
                   )}
               </div>
               <div className="text-white/80 text-sm font-light backdrop-blur-sm inline-block rounded-lg mt-1">
                  Candidate: <span className="text-white font-medium">{config.name}</span>
               </div>
           </div>

           <div className="flex flex-col items-end gap-2">
               <div className={`flex items-center gap-3 px-5 py-2 rounded-xl backdrop-blur-md border ${timeLeft < 60 ? 'bg-red-900/40 border-red-500/50' : 'bg-black/40 border-white/10'}`}>
                   <Clock className={`w-5 h-5 ${timeLeft < 60 ? 'text-red-400' : 'text-indigo-400'}`} />
                   <span className={`text-xl font-mono font-bold tracking-wider ${timeLeft < 60 ? 'text-red-100' : 'text-white'}`}>
                       {formatTime(timeLeft)}
                   </span>
               </div>
           </div>
        </div>

        {/* Live Transcript Preview (Subtitles style) */}
        <div className="absolute bottom-32 left-0 right-0 flex justify-center z-20 px-12 pointer-events-none">
            {transcript.length > 0 && (
                <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl text-center max-w-2xl border border-white/10 shadow-2xl transition-all duration-300">
                    <p className="text-indigo-300 text-xs font-bold mb-1 uppercase tracking-wider">
                        {transcript[transcript.length - 1].speaker === 'ai' ? 'Sarah (HR)' : config.name}
                    </p>
                    <p className="text-white text-lg font-medium leading-relaxed">
                        {transcript[transcript.length - 1].text}
                    </p>
                </div>
            )}
        </div>

        {/* AI Persona visualizer */}
        <div className="absolute bottom-8 left-8 z-10 flex items-end gap-4">
             <div className="bg-black/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 w-80 shadow-2xl">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5">
                        <div className="w-full h-full bg-black rounded-full flex items-center justify-center overflow-hidden relative">
                             {aiVolume > 0 && (
                                <div className="absolute inset-0 bg-indigo-500/50 animate-ping"></div>
                             )}
                             <Activity className="w-6 h-6 text-white relative z-10" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-white font-bold">Sarah (HR)</h3>
                        <p className="text-indigo-300 text-xs">Cehpoint Recruiter</p>
                    </div>
                </div>
                
                <div className="flex justify-center items-center gap-1 h-8">
                    {[...Array(8)].map((_, i) => (
                        <div 
                           key={i}
                           className="w-1.5 bg-indigo-400 rounded-full transition-all duration-75"
                           style={{ 
                               height: aiVolume > 0 ? `${Math.max(10, Math.random() * 100)}%` : '10%',
                               opacity: aiVolume > 0 ? 1 : 0.3
                           }}
                        ></div>
                    ))}
                </div>
             </div>
        </div>

        {/* User Volume Indicator */}
        <div className="absolute bottom-8 right-8 z-10">
             <div className="bg-black/40 backdrop-blur-md p-4 rounded-full border border-white/10 flex items-center gap-3">
                 <Mic className={`w-5 h-5 ${userVolume > 10 ? 'text-emerald-400' : 'text-slate-500'}`} />
                 <div className="flex gap-0.5 items-end h-6">
                    {[...Array(5)].map((_, i) => (
                         <div 
                            key={i} 
                            className={`w-1 rounded-sm ${userVolume > (i * 10) ? 'bg-emerald-400' : 'bg-slate-700'}`}
                            style={{ height: `${(i + 2) * 20}%` }}
                         ></div>
                    ))}
                 </div>
             </div>
        </div>

        {/* Overlay logic (same as before) */}
        {showContactOverlay && (
            <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center backdrop-blur-md animate-in fade-in duration-500">
                <div className="max-w-xl w-full bg-slate-900 border border-emerald-500/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/50">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Shortlisted!</h2>
                        <p className="text-slate-400 mb-8">Redirecting to full results in a few seconds...</p>
                        <div className="w-full space-y-4">
                            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <div className="bg-emerald-500/10 p-2 rounded-lg">
                                    <Phone className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-500 uppercase font-bold">CEO Direct Line</p>
                                    <p className="text-xl font-mono text-white font-bold tracking-wider">9091156095</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <div className="bg-indigo-500/10 p-2 rounded-lg">
                                    <Mail className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-500 uppercase font-bold">HR Email</p>
                                    <p className="text-lg font-mono text-white">hr@cehpoint.co.in</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 animate-[width_10s_linear_forwards] w-full origin-left"></div>
                </div>
            </div>
        )}

        {/* Fatal Error Modal */}
        {error && (
            <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl text-center max-w-md shadow-2xl">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Connection Lost</h3>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                        Restart Session
                    </button>
                </div>
            </div>
        )}

        <button 
           onClick={() => handleEndSession(false, "User voluntarily ended session.")}
           className="absolute top-1/2 right-4 -translate-y-1/2 bg-red-600/10 hover:bg-red-600/30 text-red-500 p-4 rounded-full border border-red-500/30 transition-all hover:scale-105 group z-20"
           title="Terminate Interview"
        >
           <StopCircle className="w-6 h-6 group-hover:text-red-400" />
        </button>

      </div>
    </div>
  );
};
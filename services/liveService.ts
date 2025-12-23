
import { GoogleGenAI, Modality } from "@google/genai";
import { getActiveKey } from "./apiConfig";

// Type definitions for Gemini Live API (inferred from SDK usage)
interface LiveSession {
  sendRealtimeInput(input: { media: { mimeType: string; data: string } }): void;
}

interface LiveServerMessage {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{ inlineData?: { data: string } }>;
    };
    interrupted?: boolean;
    inputTranscription?: { text: string };
    outputTranscription?: { text: string };
  };
}

/**
 * Service to handle Gemini Live API (Real-time Audio/Voice).
 * Manages AudioContext, PCM encoding/decoding, and WebSocket streaming.
 */
export class LiveService {
  private ai: GoogleGenAI | null = null;
  private session: LiveSession | null = null;
  private modelId = "gemini-2.5-flash-native-audio-preview-09-2025"; // Specific model for Live

  // Audio Contexts
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  // Playback State
  private nextStartTime = 0;
  private audioSources = new Set<AudioBufferSourceNode>();

  private onStatusChange: ((active: boolean) => void) | null = null;
  private onTranscription: ((text: string, isUser: boolean) => void) | null = null;

  constructor() {
    this.initialize();
  }

  public initialize() {
    try {
      const apiKey = getActiveKey('GOOGLE_API_KEY');
      if (apiKey) {
        this.ai = new GoogleGenAI({ apiKey });
      } else {
        this.ai = null;
      }
    } catch (e) {
      console.warn("GenAI SDK initialization failed for Live Service.");
      this.ai = null;
    }
  }

  public updateKey() {
    this.initialize();
  }

  public setStatusCallback(cb: (active: boolean) => void) {
    this.onStatusChange = cb;
  }

  public setTranscriptionCallback(cb: (text: string, isUser: boolean) => void) {
    this.onTranscription = cb;
  }

  public async start() {
    if (!this.ai) throw new Error("API Key missing");

    // Initialize Audio Contexts
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Request Mic Access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Connect to Gemini Live
    this.session = await this.ai.live.connect({
      model: this.modelId,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: "You are the Voice Interface for the GridGuard AI control room. Your goals are Grid Reliability and Economic Efficiency. Keep responses brief, professional, and military-grade. You are speaking to a grid operator.",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        // Enable Transcription
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      },
      callbacks: {
        onopen: this.handleOpen.bind(this),
        onmessage: this.handleMessage.bind(this),
        onclose: () => this.stop(),
        onerror: (err) => {
          console.error("Live Error:", err);
          this.stop();
        }
      }
    });
  }

  public stop() {
    // Cleanup Audio Input
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }

    // Cleanup Audio Output
    this.audioSources.forEach(source => source.stop());
    this.audioSources.clear();
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }

    // Close Session
    if (this.session) {
      this.session = null;
    }

    if (this.onStatusChange) this.onStatusChange(false);
  }

  private handleOpen() {
    if (!this.onStatusChange || !this.inputAudioContext || !this.mediaStream || !this.session) return;
    this.onStatusChange(true);

    // Setup Input Pipeline (Mic -> PCM -> Gemini)
    this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64 = this.arrayBufferToBase64(pcmData);

      this.session?.sendRealtimeInput({
        media: {
          mimeType: "audio/pcm;rate=16000",
          data: base64
        }
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      const audioBuffer = await this.base64ToAudioBuffer(audioData, this.outputAudioContext);
      this.playAudio(audioBuffer);
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.audioSources.forEach(source => source.stop());
      this.audioSources.clear();
      this.nextStartTime = 0;
    }

    // Handle Transcriptions
    if (this.onTranscription) {
      if (message.serverContent?.inputTranscription?.text) {
        const userText = message.serverContent.inputTranscription.text;
        this.onTranscription(userText, true);

        // VOICE COMMAND PARSING
        this.parseVoiceCommand(userText);
      }
      if (message.serverContent?.outputTranscription?.text) {
        this.onTranscription(message.serverContent.outputTranscription.text, false);
      }
    }
  }

  /**
   * VOICE COMMAND PARSER
   * Parses natural language voice commands for map navigation and grid queries
   */
  private parseVoiceCommand(text: string) {
    const lower = text.toLowerCase();

    // NAVIGATION COMMANDS
    const navCommands: Record<string, string> = {
      'houston': 'Houston',
      'go to houston': 'Houston',
      'show me houston': 'Houston',
      'fly to houston': 'Houston',
      'dallas': 'DFW',
      'dfw': 'DFW',
      'go to dallas': 'DFW',
      'show me dallas': 'DFW',
      'austin': 'Austin',
      'go to austin': 'Austin',
      'show me austin': 'Austin',
      'nuclear': 'Nuclear',
      'comanche peak': 'Nuclear',
      'south texas project': 'Nuclear',
      'show me nuclear': 'Nuclear',
      'west texas': 'West',
      'wind farms': 'West',
      'permian': 'West',
      'go west': 'West',
      'show me west': 'West',
      'overview': 'Overview',
      'zoom out': 'Overview',
      'show full grid': 'Overview',
      'show everything': 'Overview',
      'big picture': 'Overview'
    };

    // Check for navigation command
    for (const [phrase, destination] of Object.entries(navCommands)) {
      if (lower.includes(phrase)) {
        console.log(`[VOICE] Navigation command detected: ${destination}`);
        window.dispatchEvent(new CustomEvent('gridguard-navigate-map', {
          detail: { destination }
        }));
        return;
      }
    }

    // GRID QUERY COMMANDS
    if (lower.includes('current load') || lower.includes('what is the load') || lower.includes('how much load')) {
      this.announceGridData('load');
      return;
    }

    if (lower.includes('frequency') || lower.includes('what is the frequency') || lower.includes('grid frequency')) {
      this.announceGridData('frequency');
      return;
    }

    if (lower.includes('grid status') || lower.includes('how is the grid') || lower.includes('status report')) {
      this.announceGridData('status');
      return;
    }

    if (lower.includes('critical') || lower.includes('any alerts') || lower.includes('warnings')) {
      this.announceGridData('alerts');
      return;
    }
  }

  /**
   * Announce grid data using speech synthesis
   */
  private announceGridData(type: string) {
    // Request data from context/state and speak it
    window.dispatchEvent(new CustomEvent('gridguard-voice-query', {
      detail: { queryType: type }
    }));
  }

  private playAudio(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioContext.destination);

    const currentTime = this.outputAudioContext.currentTime;
    // Schedule next chunk
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    this.audioSources.add(source);
    source.onended = () => this.audioSources.delete(source);
  }

  // --- Utils ---

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private async base64ToAudioBuffer(base64: string, ctx: AudioContext): Promise<AudioBuffer> {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert 16-bit PCM to Float32
    const int16View = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16View.length);
    for (let i = 0; i < int16View.length; i++) {
      float32[i] = int16View[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    return buffer;
  }
}

export const liveService = new LiveService();

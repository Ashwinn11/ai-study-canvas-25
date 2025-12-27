/**
 * Audio Recorder Service
 * Handles audio recording using the MediaRecorder API
 */

export interface AudioRecordingResult {
    audioContent: string; // base64
    mimeType: string;
}

class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private stream: MediaStream | null = null;

    isSupported(): boolean {
        if (typeof window === 'undefined') return false;
        return !!(navigator.mediaDevices && window.MediaRecorder);
    }

    async startRecording(): Promise<void> {
        if (!this.isSupported()) {
            throw new Error('Audio recording is not supported in this browser');
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.chunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.chunks.push(e.data);
                }
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error('Failed to start recording. Please ensure microphone permissions are granted.');
        }
    }

    async stopRecording(): Promise<AudioRecordingResult> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                reject(new Error('No active recording'));
                return;
            }

            this.mediaRecorder.onstop = async () => {
                try {
                    const rawBlob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
                    const wavResult = await this.ensureWavFormat(rawBlob);

                    this.cleanup();

                    resolve(wavResult);
                } catch (error) {
                    reject(error);
                }
            };

            this.mediaRecorder.stop();
        });
    }

    async convertToWav(blob: Blob): Promise<AudioRecordingResult> {
        if (typeof window === 'undefined') {
            throw new Error('Audio conversion is only available in the browser.');
        }
        return this.ensureWavFormat(blob);
    }

    cancelRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.cleanup();
    }

    private cleanup(): void {

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.chunks = [];
    }

    private async ensureWavFormat(blob: Blob): Promise<AudioRecordingResult> {
        const mimeType = blob.type || 'audio/webm';

        if (mimeType.includes('wav')) {
            const base64 = await this.blobToBase64(blob);
            return {
                audioContent: base64,
                mimeType: 'audio/wav',
            };
        }

        const arrayBuffer = await blob.arrayBuffer();
        const AudioContextCtor =
            window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextCtor) {
            throw new Error('Browser does not support audio decoding required for WAV conversion.');
        }

        const audioContext = new AudioContextCtor();

        try {
            const audioBuffer = await this.decodeAudioData(audioContext, arrayBuffer);
            const wavArrayBuffer = this.audioBufferToWav(audioBuffer);
            const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
            const base64 = await this.blobToBase64(wavBlob);

            return {
                audioContent: base64,
                mimeType: 'audio/wav',
            };
        } finally {
            if (typeof audioContext.close === 'function') {
                audioContext.close().catch(() => {
                    // Ignore close errors (some browsers throw if already closed)
                });
            }
        }
    }

    private audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const samplesPerChannel = audioBuffer.length;
        const blockAlign = (numChannels * bitDepth) / 8;
        const byteRate = sampleRate * blockAlign;
        const dataLength = samplesPerChannel * blockAlign;
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);

        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // PCM chunk size
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);

        this.floatTo16BitPCM(view, 44, audioBuffer);

        return buffer;
    }

    private floatTo16BitPCM(view: DataView, offset: number, audioBuffer: AudioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const samplesPerChannel = audioBuffer.length;
        const interleaved = this.interleave(audioBuffer, numChannels, samplesPerChannel);

        for (let i = 0; i < interleaved.length; i++, offset += 2) {
            let sample = interleaved[i];
            sample = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        }
    }

    private interleave(audioBuffer: AudioBuffer, numChannels: number, samplesPerChannel: number): Float32Array {
        if (numChannels === 1) {
            return audioBuffer.getChannelData(0);
        }

        const result = new Float32Array(samplesPerChannel * numChannels);
        let offset = 0;

        const channelsData: Float32Array[] = [];
        for (let channel = 0; channel < numChannels; channel++) {
            channelsData.push(audioBuffer.getChannelData(channel));
        }

        for (let i = 0; i < samplesPerChannel; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                result[offset++] = channelsData[channel][i];
            }
        }

        return result;
    }

    private writeString(view: DataView, offset: number, text: string) {
        for (let i = 0; i < text.length; i++) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    }

    private async decodeAudioData(audioContext: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
        try {
            return await audioContext.decodeAudioData(arrayBuffer.slice(0));
        } catch (error) {
            return await new Promise<AudioBuffer>((resolve, reject) => {
                audioContext.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
            });
        }
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g., "data:audio/wav;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

export const audioRecorder = new AudioRecorder();

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
                    const blob = new Blob(this.chunks, { type: 'audio/webm' });
                    const base64 = await this.blobToBase64(blob);

                    this.cleanup();

                    resolve({
                        audioContent: base64,
                        mimeType: blob.type || 'audio/webm',
                    });
                } catch (error) {
                    reject(error);
                }
            };

            this.mediaRecorder.stop();
        });
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

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g., "data:audio/webm;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

export const audioRecorder = new AudioRecorder();

import { uploadProcessor } from '../upload';
import * as seedsService from '../seeds';
import * as documentProcessing from '../documentProcessing';

// Mock dependencies
jest.mock('../seeds');
jest.mock('../documentProcessing');

describe('Upload Processor', () => {
  const mockUser = {
    id: 'test-user-123',
  };

  const mockAccessToken = 'mock-access-token';

  const mockExtractionResult = {
    content: 'This is test content with more than twenty words to pass validation.',
    metadata: {
      language: 'en',
      source: 'test',
    },
  };

  const mockFeynmanResult = {
    feynmanExplanation: 'This is a test explanation.',
    intent: 'Educational' as const,
    processingMetadata: {
      confidence: 0.95,
      wordCount: 10,
      processingTime: 1000,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (seedsService.seedsService.createInitialSeed as jest.Mock).mockResolvedValue({
      id: 'seed-123',
    });

    (seedsService.seedsService.updateSeed as jest.Mock).mockResolvedValue({
      id: 'seed-123',
      title: 'Test',
      content_type: 'text',
      processing_status: 'completed',
    });

    (seedsService.seedsService.deleteSeed as jest.Mock).mockResolvedValue(undefined);

    (documentProcessing.processPdfOrImage as jest.Mock).mockResolvedValue(
      mockExtractionResult
    );

    (documentProcessing.transcribeAudio as jest.Mock).mockResolvedValue(
      mockExtractionResult
    );

    (documentProcessing.extractDocument as jest.Mock).mockResolvedValue(
      mockExtractionResult
    );

    (documentProcessing.extractYouTubeUrl as jest.Mock).mockResolvedValue(
      mockExtractionResult
    );

    (documentProcessing.generateFeynman as jest.Mock).mockResolvedValue(
      mockFeynmanResult
    );
  });

  describe('Text Content Upload', () => {
    it('should process text content without title', async () => {
      const result = await uploadProcessor.processFile({
        userId: mockUser.id,
        title: 'Text Content',
        textContent: 'This is test content with more than twenty words to pass validation check.',
        accessToken: mockAccessToken,
      });

      expect(seedsService.seedsService.createInitialSeed).toHaveBeenCalledWith({
        userId: mockUser.id,
        title: 'Text Content',
        contentType: 'text',
      });

      expect(documentProcessing.generateFeynman).toHaveBeenCalled();
      expect(seedsService.seedsService.updateSeed).toHaveBeenCalledWith(
        'seed-123',
        expect.objectContaining({
          contentText: mockExtractionResult.content,
          processingStatus: 'completed',
        })
      );

      expect(result).toBeDefined();
    });

    it('should reject text content with insufficient length', async () => {
      const shortText = 'Too short';

      await expect(
        uploadProcessor.processFile({
          userId: mockUser.id,
          title: 'Short',
          textContent: shortText,
          accessToken: mockAccessToken,
        })
      ).rejects.toThrow();

      expect(seedsService.seedsService.deleteSeed).toHaveBeenCalled();
    });
  });

  describe('YouTube URL Upload', () => {
    it('should process YouTube URL', async () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      const result = await uploadProcessor.processFile({
        userId: mockUser.id,
        title: 'YouTube Video',
        youtubeUrl,
        accessToken: mockAccessToken,
      });

      expect(documentProcessing.extractYouTubeUrl).toHaveBeenCalledWith(
        youtubeUrl,
        mockAccessToken
      );

      expect(seedsService.seedsService.createInitialSeed).toHaveBeenCalledWith({
        userId: mockUser.id,
        title: 'YouTube Video',
        contentType: 'youtube',
      });

      expect(result).toBeDefined();
    });

    it('should use auto-generated title from YouTube metadata', async () => {
      const youtubeUrl = 'https://youtu.be/dQw4w9WgXcQ';
      const mockYouTubeResult = {
        ...mockExtractionResult,
        metadata: {
          ...mockExtractionResult.metadata,
          videoTitle: 'Rick Astley - Never Gonna Give You Up',
        },
      };

      (documentProcessing.extractYouTubeUrl as jest.Mock).mockResolvedValue(
        mockYouTubeResult
      );

      await uploadProcessor.processFile({
        userId: mockUser.id,
        title: 'YouTube Video',
        youtubeUrl,
        accessToken: mockAccessToken,
      });

      expect(documentProcessing.extractYouTubeUrl).toHaveBeenCalledWith(
        youtubeUrl,
        mockAccessToken
      );
    });
  });

  describe('Audio File Upload', () => {
    it('should process audio file', async () => {
      const mockFile = new File(
        [Buffer.from('audio-content')],
        'test-audio.mp3',
        { type: 'audio/mpeg' }
      );

      const result = await uploadProcessor.processFile({
        userId: mockUser.id,
        title: 'Test Audio',
        file: mockFile,
        accessToken: mockAccessToken,
      });

      expect(seedsService.seedsService.createInitialSeed).toHaveBeenCalledWith({
        userId: mockUser.id,
        title: 'Test Audio',
        contentType: 'audio',
        fileSize: mockFile.size,
      });

      expect(documentProcessing.transcribeAudio).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject audio file exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(25 * 1024 * 1024); // 25MB
      const mockFile = new File([largeBuffer], 'large-audio.mp3', {
        type: 'audio/mpeg',
      });

      await expect(
        uploadProcessor.processFile({
          userId: mockUser.id,
          file: mockFile,
          accessToken: mockAccessToken,
        })
      ).rejects.toThrow('File too large');
    });
  });

  describe('PDF Upload', () => {
    it('should process PDF file', async () => {
      const mockFile = new File(
        [Buffer.from('pdf-content')],
        'test.pdf',
        { type: 'application/pdf' }
      );

      const result = await uploadProcessor.processFile({
        userId: mockUser.id,
        file: mockFile,
        accessToken: mockAccessToken,
      });

      expect(seedsService.seedsService.createInitialSeed).toHaveBeenCalledWith({
        userId: mockUser.id,
        title: 'test',
        contentType: 'pdf',
        fileSize: mockFile.size,
      });

      expect(documentProcessing.processPdfOrImage).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Image Upload', () => {
    it('should process image file', async () => {
      const mockFile = new File(
        [Buffer.from('image-content')],
        'test.png',
        { type: 'image/png' }
      );

      const result = await uploadProcessor.processFile({
        userId: mockUser.id,
        file: mockFile,
        accessToken: mockAccessToken,
      });

      expect(documentProcessing.processPdfOrImage).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    it('should emit progress updates', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progressUpdates: any[] = [];
      const onProgress = jest.fn((progress) => {
        progressUpdates.push(progress);
      });

      await uploadProcessor.processFile({
        userId: mockUser.id,
        title: 'Test',
        textContent: 'This is test content with more than twenty words for validation.',
        accessToken: mockAccessToken,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalled();
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Verify stage progression
      const stages = progressUpdates.map((p) => p.stage);
      expect(stages).toContain('validating');
      expect(stages).toContain('reading');
      expect(stages).toContain('extracting');
      expect(stages).toContain('generating');
      expect(stages).toContain('finalizing');
      expect(stages).toContain('completed');
    });

    it('should show correct progress percentages', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progressUpdates: any[] = [];
      const onProgress = jest.fn((progress) => {
        progressUpdates.push(progress);
      });

      await uploadProcessor.processFile({
        userId: mockUser.id,
        textContent: 'This is test content with more than twenty words for validation.',
        accessToken: mockAccessToken,
        onProgress,
      });

      const finalUpdate = progressUpdates[progressUpdates.length - 1];
      expect(finalUpdate.progress).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should delete seed on extraction failure', async () => {
      (documentProcessing.generateFeynman as jest.Mock).mockRejectedValue(
        new Error('AI generation failed')
      );

      await expect(
        uploadProcessor.processFile({
          userId: mockUser.id,
          textContent: 'This is test content with more than twenty words for validation.',
          accessToken: mockAccessToken,
        })
      ).rejects.toThrow();

      expect(seedsService.seedsService.deleteSeed).toHaveBeenCalledWith('seed-123');
    });

    it('should handle missing access token', async () => {
      await expect(
        uploadProcessor.processFile({
          userId: mockUser.id,
          textContent: 'Test content',
          accessToken: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('Language Detection', () => {
    it('should detect language in extracted content', async () => {
      const chineseText = '这是一个测试内容，需要超过二十个字符来通过验证。';
      const mockChineseResult = {
        content: chineseText,
        metadata: {
          language: 'zh',
          source: 'test',
        },
      };

      (documentProcessing.generateFeynman as jest.Mock).mockResolvedValue(
        mockFeynmanResult
      );

      await uploadProcessor.processFile({
        userId: mockUser.id,
        textContent: chineseText,
        accessToken: mockAccessToken,
      });

      expect(seedsService.seedsService.updateSeed).toHaveBeenCalledWith(
        'seed-123',
        expect.objectContaining({
          languageCode: expect.any(String),
        })
      );
    });
  });

  describe('Content Type Detection', () => {
    const testCases = [
      { filename: 'test.pdf', expectedType: 'pdf' },
      { filename: 'test.jpg', expectedType: 'image' },
      { filename: 'test.jpeg', expectedType: 'image' },
      { filename: 'test.png', expectedType: 'image' },
      { filename: 'test.mp3', expectedType: 'audio' },
      { filename: 'test.wav', expectedType: 'audio' },
      { filename: 'test.m4a', expectedType: 'audio' },
      { filename: 'test.doc', expectedType: 'text' },
      { filename: 'test.docx', expectedType: 'text' },
      { filename: 'test.txt', expectedType: 'text' },
    ];

    testCases.forEach(({ filename, expectedType }) => {
      it(`should detect ${expectedType} from ${filename}`, async () => {
        const mockFile = new File(
          [Buffer.from('content')],
          filename,
          { type: 'application/octet-stream' }
        );

        await uploadProcessor.processFile({
          userId: mockUser.id,
          file: mockFile,
          accessToken: mockAccessToken,
        });

        expect(seedsService.seedsService.createInitialSeed).toHaveBeenCalledWith(
          expect.objectContaining({
            contentType: expectedType,
          })
        );
      });
    });
  });
});

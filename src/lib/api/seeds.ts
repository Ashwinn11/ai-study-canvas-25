import { getSupabaseClient } from '../supabase/client';
import { Seed, type Database } from '../supabase/types';

export interface CreateSeedParams {
  userId: string;
  title: string;
  contentType: 'pdf' | 'image' | 'audio' | 'text' | 'youtube';
  fileSize?: number;
}

export interface UpdateSeedParams {
  contentText?: string;
  originalContent?: string;
  feynmanExplanation?: string;
  intent?: 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural';
  confidenceScore?: number;
  processingStatus?: 'pending' | 'extracting' | 'analyzing' | 'completed' | 'failed';
  extractionMetadata?: unknown;
  processingError?: string;
  languageCode?: string;
  isMixedLanguage?: boolean;
  languageMetadata?: unknown;
}

export class SeedsService {
  /**
   * Create a new seed with initial "pending" status
   */
  async createInitialSeed(params: CreateSeedParams): Promise<{ id: string }> {
    const supabase = getSupabaseClient();

    const seedData: Database['public']['Tables']['seeds']['Insert'] = {
      user_id: params.userId,
      title: params.title,
      content_type: params.contentType,
      file_size: params.fileSize,
      processing_status: 'pending',
      is_starred: false,
      is_archived: false,
    };

    // Type assertion workaround for Supabase client typing issue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('seeds')
      .insert(seedData)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create seed: ${error.message}`);
    }

    return data;
  }

  /**
   * Update seed with processing results
   */
  async updateSeed(seedId: string, params: UpdateSeedParams): Promise<Seed> {
    const supabase = getSupabaseClient();

    const updateData: Partial<Database['public']['Tables']['seeds']['Update']> = {};

    if (params.contentText !== undefined) updateData.content_text = params.contentText;
    if (params.originalContent !== undefined) updateData.original_content = params.originalContent;
    if (params.feynmanExplanation !== undefined) updateData.feynman_explanation = params.feynmanExplanation;
    if (params.intent !== undefined) updateData.intent = params.intent;
    if (params.confidenceScore !== undefined) updateData.confidence_score = params.confidenceScore;
    if (params.processingStatus !== undefined) updateData.processing_status = params.processingStatus;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (params.extractionMetadata !== undefined) updateData.extraction_metadata = params.extractionMetadata as any;
    if (params.processingError !== undefined) updateData.processing_error = params.processingError;
    if (params.languageCode !== undefined) updateData.language_code = params.languageCode;
    if (params.isMixedLanguage !== undefined) updateData.is_mixed_language = params.isMixedLanguage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (params.languageMetadata !== undefined) updateData.language_metadata = params.languageMetadata as any;

    // Type assertion workaround for Supabase client typing issue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('seeds')
      .update(updateData)
      .eq('id', seedId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update seed: ${error.message}`);
    }

    return data as Seed;
  }

  /**
   * Delete a seed
   */
  async deleteSeed(seedId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('seeds')
      .delete()
      .eq('id', seedId);

    if (error) {
      throw new Error(`Failed to delete seed: ${error.message}`);
    }
  }

  /**
   * Get seed by ID
   */
  async getSeed(seedId: string, userId: string): Promise<Seed | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('seeds')
      .select('*')
      .eq('id', seedId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get seed: ${error.message}`);
    }

    return data as Seed;
  }

  /**
   * Get all seeds for a user
   */
  async getUserSeeds(userId: string): Promise<Seed[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('seeds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get seeds: ${error.message}`);
    }

    return (data as Seed[]) || [];
  }
}

export const seedsService = new SeedsService();

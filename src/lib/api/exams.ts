import { getSupabaseClient } from '@/lib/supabase/client';

export interface Exam {
  id: string;
  user_id: string;
  subject_name: string;
  created_at: string;
}

export interface ExamSeed {
  id: string;
  exam_id: string;
  seed_id: string;
  user_id: string;
  created_at: string;
}

export interface ExamWithSeeds extends Exam {
  seeds: any[];
}

export interface CreateExamData {
  subject_name: string;
}

export interface UpdateExamData {
  subject_name?: string;
}

class ExamsService {
  async createExam(data: CreateExamData): Promise<{ exam?: Exam; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        return { error: 'Authentication required' };
      }

      if (!session?.user) {
        return { error: 'User authentication required to create exams. Please sign in first.' };
      }

      const { data: exam, error } = await supabase
        .from('exams')
        .insert({
          user_id: session.user.id,
          subject_name: data.subject_name,
        })
        .select()
        .single();

      if (error) {
        console.error('Create exam error:', error);
        return { error: `Failed to create exam: ${error.message}` };
      }

      return { exam: exam as Exam };
    } catch (error) {
      console.error('Create exam exception:', error);
      return { error: 'Failed to create exam' };
    }
  }

  async getExams(): Promise<{ exams?: Exam[]; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        return { exams: [] };
      }

      const { data: exams, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get exams error:', error);
        return { error: `Failed to fetch exams: ${error.message}` };
      }

      return { exams: (exams as Exam[]) || [] };
    } catch (error) {
      console.error('Get exams exception:', error);
      return { error: 'Failed to fetch exams' };
    }
  }

  async getExam(id: string): Promise<{ exam?: Exam; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Authentication required' };
      }

      const { data: exam, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Get exam error:', error);
        return { error: 'Failed to fetch exam' };
      }

      return { exam: exam as Exam };
    } catch (error) {
      console.error('Get exam exception:', error);
      return { error: 'Failed to fetch exam' };
    }
  }

  async updateExam(id: string, data: UpdateExamData): Promise<{ exam?: Exam; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Authentication required' };
      }

      const { data: exam, error } = await supabase
        .from('exams')
        .update(data)
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Update exam error:', error);
        return { error: 'Failed to update exam' };
      }

      return { exam: exam as Exam };
    } catch (error) {
      console.error('Update exam exception:', error);
      return { error: 'Failed to update exam' };
    }
  }

  async deleteExam(id: string): Promise<{ error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Authentication required' };
      }

      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Delete exam error:', error);
        return { error: 'Failed to delete exam' };
      }

      return {};
    } catch (error) {
      console.error('Delete exam exception:', error);
      return { error: 'Failed to delete exam' };
    }
  }

  async getExamWithSeeds(examId: string): Promise<{ examWithSeeds?: ExamWithSeeds; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Authentication required' };
      }

      // Get exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .eq('user_id', session.user.id)
        .single();

      if (examError || !exam) {
        console.error('Get exam error:', examError);
        return { error: 'Failed to fetch exam' };
      }

      // Get seeds for this exam
      const { data: examSeeds, error: examSeedsError } = await supabase
        .from('exam_seeds')
        .select('seed_id')
        .eq('exam_id', examId)
        .eq('user_id', session.user.id);

      if (examSeedsError) {
        console.error('Get exam seeds error:', examSeedsError);
        return { error: 'Failed to fetch exam seeds' };
      }

      const seedIds = (examSeeds || []).map((es: any) => es.seed_id);

      // Get seed details
      let seeds = [];
      if (seedIds.length > 0) {
        const { data: seedsData, error: seedsError } = await supabase
          .from('seeds')
          .select('*')
          .in('id', seedIds)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (seedsError) {
          console.error('Get seeds error:', seedsError);
          return { error: 'Failed to fetch seeds' };
        }

        seeds = seedsData || [];
      }

      const examWithSeeds: ExamWithSeeds = {
        ...exam,
        seeds,
      };

      return { examWithSeeds };
    } catch (error) {
      console.error('Get exam with seeds exception:', error);
      return { error: 'Failed to fetch exam details' };
    }
  }

  async addSeedToExam(examId: string, seedId: string): Promise<{ examSeed?: ExamSeed; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Authentication required' };
      }

      const { data: examSeed, error } = await supabase
        .from('exam_seeds')
        .insert({
          exam_id: examId,
          seed_id: seedId,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Add seed to exam error:', error);
        return { error: 'Failed to add seed to exam' };
      }

      return { examSeed: examSeed as ExamSeed };
    } catch (error) {
      console.error('Add seed to exam exception:', error);
      return { error: 'Failed to add seed to exam' };
    }
  }

  async addMultipleSeedsToExam(
    examId: string,
    seedIds: string[]
  ): Promise<{ errors?: string[] }> {
    const errors: string[] = [];

    for (const seedId of seedIds) {
      const result = await this.addSeedToExam(examId, seedId);
      if (result.error) {
        errors.push(`Failed to add seed ${seedId}: ${result.error}`);
      }
    }

    return { errors: errors.length > 0 ? errors : undefined };
  }

  async removeSeedFromExam(examId: string, seedId: string): Promise<{ error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Authentication required' };
      }

      const { error } = await supabase
        .from('exam_seeds')
        .delete()
        .eq('exam_id', examId)
        .eq('seed_id', seedId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Remove seed from exam error:', error);
        return { error: 'Failed to remove seed from exam' };
      }

      return {};
    } catch (error) {
      console.error('Remove seed from exam exception:', error);
      return { error: 'Failed to remove seed from exam' };
    }
  }
}

export const examsService = new ExamsService();

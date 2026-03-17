// src/lib/supabaseService.js
import { supabase } from './supabaseClient';

const requireBlockchainAudit = String(
  process.env.REACT_APP_REQUIRE_BLOCKCHAIN_AUDIT ?? 'true'
).toLowerCase() !== 'false';

/**
 * Announcements Service
 */
export const announcementsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('announcements')
      .select('id,title,content,priority,created_at,author_id')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((a) => ({
      ...a,
      text: a.content,
      timestamp: a.created_at,
      author: 'Admin'
    }));
  },

  async create(announcement) {
    const payload = {
      title: announcement.title,
      content: announcement.text || announcement.content || '',
      priority: announcement.priority || 'medium',
      author_id: announcement.author_id
    };
    const { data, error } = await supabase
      .from('announcements')
      .insert([payload])
      .select();
    if (error) throw error;
    const row = data[0];
    return {
      ...row,
      text: row.content,
      timestamp: row.created_at,
      author: 'Admin'
    };
  },

  async update(id, announcement) {
    const payload = {
      title: announcement.title,
      content: announcement.text || announcement.content || '',
      priority: announcement.priority || 'medium'
    };
    const { data, error } = await supabase
      .from('announcements')
      .update(payload)
      .eq('id', id)
      .select();
    if (error) throw error;
    const row = data[0];
    return {
      ...row,
      text: row.content,
      timestamp: row.created_at,
      author: 'Admin'
    };
  },

  async delete(id) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

/**
 * Positions Service
 */
export const positionsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(position) {
    const { data, error } = await supabase
      .from('positions')
      .insert([position])
      .select();
    if (error) throw error;
    return data[0];
  },

  async update(id, position) {
    const { data, error } = await supabase
      .from('positions')
      .update(position)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async delete(id) {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

/**
 * Candidates Service
 */
export const candidatesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        position:positions(id, name),
        user:users(id, full_name, email)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getAllAdmin() {
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        position:positions(id, name),
        user:users(id, full_name, email)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByPosition(positionId) {
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        position:positions(id, name),
        user:users(id, full_name, email)
      `)
      .eq('position_id', positionId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getPending() {
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        position:positions(id, name),
        user:users(id, full_name, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(candidate) {
    const { data, error } = await supabase
      .from('candidates')
      .insert([candidate])
      .select();
    if (error) throw error;
    return data[0];
  },

  async update(id, candidate) {
    const { data, error } = await supabase
      .from('candidates')
      .update(candidate)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async updateStatus(id, status) {
    return this.update(id, { status, updated_at: new Date() });
  },

  async delete(id) {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

/**
 * Votes Service
 */
export const votesService = {
  async cast(studentId, candidateId, positionId, blockchainVote = null) {
    if (requireBlockchainAudit && !blockchainVote) {
      throw new Error('Blockchain audit is required but no blockchain proof was provided');
    }

    // First, ensure the user record exists
    try {
      const existingUser = await this.getById(studentId);
      if (!existingUser) {
        // Try to create user record from auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await this.upsert({
            id: studentId,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            role: user.user_metadata?.role || 'student',
            student_id: user.user_metadata?.student_id || null,
            department: user.user_metadata?.department || null,
            year: user.user_metadata?.year || null,
            phone: user.user_metadata?.phone || null,
            verified: !!user.email_confirmed_at
          });
        }
      }
    } catch (userCheckErr) {
      console.warn('User record check/create failed:', userCheckErr);
      // Continue anyway - the insert might still work
    }

    const { data, error } = await supabase
      .from('votes')
      .insert([
        {
          student_id: studentId,
          candidate_id: candidateId,
          position_id: positionId,
          timestamp: new Date(),
        },
      ])
      .select();
    if (error) {
      const rawMessage = error?.message || '';
      const isRlsError =
        error?.code === '42501' ||
        /row-level security|permission denied/i.test(rawMessage);
      const isDuplicateVote = error?.code === '23505';
      const isForeignKeyError = error?.code === '23503';

      if (isRlsError) {
        throw new Error(
          'Vote save blocked by database policy. Run fix_votes_rls.sql and fix_signup_database.sql in Supabase.'
        );
      }
      if (isDuplicateVote) {
        throw new Error('You have already voted for this position.');
      }
      if (isForeignKeyError) {
        throw new Error(
          'Vote save failed due to user/profile mismatch. Run fix_signup_database.sql in Supabase and sign in again.'
        );
      }

      throw error;
    }

    const voteRow = data[0];
    if (blockchainVote && voteRow?.id) {
      const auditStored = await this.recordBlockchainAudit(voteRow.id, blockchainVote);
      if (requireBlockchainAudit && !auditStored) {
        const { error: rollbackError } = await supabase
          .from('votes')
          .delete()
          .eq('id', voteRow.id);

        if (rollbackError) {
          throw new Error(
            'Blockchain audit failed and vote rollback failed. Contact admin immediately.'
          );
        }

        throw new Error('Vote was not saved because blockchain proof could not be stored.');
      }
    }

    return voteRow;
  },

  async recordBlockchainAudit(voteId, blockchainVote) {
    const { error } = await supabase
      .from('vote_blockchain_audit')
      .insert([
        {
          vote_id: voteId,
          tx_hash: blockchainVote.txHash,
          block_number: blockchainVote.blockNumber,
          commitment: blockchainVote.commitment,
          voter_nullifier: blockchainVote.voterNullifier,
          wallet_address: blockchainVote.walletAddress,
          contract_address: blockchainVote.contractAddress,
          election_id: blockchainVote.electionId
        },
      ]);

    // Keep vote flow working if audit table is not created yet.
    if (error) {
      console.warn('Blockchain audit insert skipped:', error.message || error);
      return false;
    }

    return true;
  },

  async getByStudent(studentId) {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByCandidate(candidateId) {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByPosition(positionId) {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('position_id', positionId)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAllWithBlockchainAudit() {
    const { data, error } = await supabase
      .from('votes')
      .select(`
        *,
        vote_blockchain_audit(
          id,
          tx_hash,
          block_number,
          commitment,
          voter_nullifier,
          wallet_address,
          contract_address,
          election_id,
          created_at
        )
      `)
      .order('timestamp', { ascending: false });
    if (error) throw error;

    return (data || []).map((row) => {
      const audit = Array.isArray(row.vote_blockchain_audit)
        ? row.vote_blockchain_audit[0] || null
        : row.vote_blockchain_audit || null;

      return {
        ...row,
        blockchain_audit: audit,
        has_blockchain_proof: !!audit
      };
    });
  },

  async getByStudentWithBlockchainAudit(studentId) {
    const { data, error } = await supabase
      .from('votes')
      .select(`
        *,
        vote_blockchain_audit(
          id,
          tx_hash,
          block_number,
          commitment,
          voter_nullifier,
          wallet_address,
          contract_address,
          election_id,
          created_at
        )
      `)
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false });
    if (error) throw error;

    return (data || []).map((row) => {
      const audit = Array.isArray(row.vote_blockchain_audit)
        ? row.vote_blockchain_audit[0] || null
        : row.vote_blockchain_audit || null;

      return {
        ...row,
        blockchain_audit: audit,
        has_blockchain_proof: !!audit
      };
    });
  },

  async hasVoted(studentId, positionId) {
    const { data, error } = await supabase
      .from('votes')
      .select('id')
      .eq('student_id', studentId)
      .eq('position_id', positionId)
      .limit(1)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async getResultsForPosition(positionId) {
    const { data, error } = await supabase
      .from('votes')
      .select('candidate_id, candidates(name, party), COUNT(*)')
      .eq('position_id', positionId)
      .group_by('candidate_id');
    if (error) throw error;
    return data;
  },
};

/**
 * Election Settings Service
 */
export const electionSettingsService = {
  async getActive() {
    // Fetch latest active settings first. If none is active, fall back to latest row
    // so students still see schedule updates when admin edits settings.
    const { data: activeData, error: activeError } = await supabase
      .from('election_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError && activeError.code !== 'PGRST116') throw activeError;

    let data = activeData;
    if (!data) {
      const { data: latestData, error: latestError } = await supabase
        .from('election_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError && latestError.code !== 'PGRST116') throw latestError;
      data = latestData || null;
    }

    if (!data) return null;
    return {
      ...data,
      startTime: data.start_date || '',
      endTime: data.end_date || '',
      isActive: !!data.is_active
    };
  },

  async getAll() {
    const { data, error } = await supabase
      .from('election_settings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      startTime: row.start_date || '',
      endTime: row.end_date || '',
      isActive: !!row.is_active
    }));
  },

  async create(settings) {
    const payload = {
      title: settings.title,
      description: settings.description,
      start_date: settings.startTime || null,
      end_date: settings.endTime || null,
      is_active: !!settings.isActive
    };
    const { data, error } = await supabase
      .from('election_settings')
      .insert([payload])
      .select();
    if (error) throw error;
    const row = data[0];
    return {
      ...row,
      startTime: row.start_date || '',
      endTime: row.end_date || '',
      isActive: !!row.is_active
    };
  },

  async update(id, settings) {
    const payload = {
      title: settings.title,
      description: settings.description,
      start_date: settings.startTime || null,
      end_date: settings.endTime || null,
      is_active: !!settings.isActive
    };
    const { data, error } = await supabase
      .from('election_settings')
      .update(payload)
      .eq('id', id)
      .select();
    if (error) throw error;
    const row = data[0];
    return {
      ...row,
      startTime: row.start_date || '',
      endTime: row.end_date || '',
      isActive: !!row.is_active
    };
  },

  async delete(id) {
    const { error } = await supabase
      .from('election_settings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

/**
 * Candidate Requests Service
 */
export const candidateRequestsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('candidate_requests')
      .select(`
        *,
        position:positions(id, name),
        user:users(id, full_name, email)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getPending() {
    const { data, error } = await supabase
      .from('candidate_requests')
      .select(`
        *,
        position:positions(id, name),
        user:users(id, full_name, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(request) {
    const { data, error } = await supabase
      .from('candidate_requests')
      .insert([request])
      .select();
    if (error) throw error;
    return data[0];
  },

  async update(id, request) {
    const { data, error } = await supabase
      .from('candidate_requests')
      .update(request)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async approve(id) {
    return this.update(id, { status: 'approved', updated_at: new Date() });
  },

  async reject(id) {
    return this.update(id, { status: 'rejected', updated_at: new Date() });
  },

  async delete(id) {
    const { error } = await supabase
      .from('candidate_requests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

/**
 * College Event Requests Service
 */
export const collegeEventRequestsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('college_event_requests')
      .select(`
        *,
        candidate:candidates(id, name, party, position_id),
        user:users(id, full_name, email)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByWinnerUser(userId) {
    const { data, error } = await supabase
      .from('college_event_requests')
      .select(`
        *,
        candidate:candidates(id, name, party, position_id),
        user:users(id, full_name, email)
      `)
      .eq('winner_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPendingByWinnerUser(userId) {
    const { data, error } = await supabase
      .from('college_event_requests')
      .select('*')
      .eq('winner_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(request) {
    const { data, error } = await supabase
      .from('college_event_requests')
      .insert([request])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, request) {
    const { data, error } = await supabase
      .from('college_event_requests')
      .update(request)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async approve(id, adminNotes = null) {
    return this.update(id, {
      status: 'approved',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  },

  async reject(id, adminNotes = null) {
    return this.update(id, {
      status: 'rejected',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }
};

/**
 * Campus Events Service
 */
export const campusEventsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('campus_events')
      .select('*')
      .order('event_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getVisibleForStudents() {
    const { data, error } = await supabase
      .from('campus_events')
      .select('*')
      .in('status', ['approved', 'published', 'completed'])
      .order('event_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(eventData) {
    const { data, error } = await supabase
      .from('campus_events')
      .insert([eventData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('campus_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/**
 * Event Registrations Service
 */
export const eventRegistrationsService = {
  async getByEvent(eventId) {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        user:users(id, full_name, email, department, year)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByUser(userId) {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        event:campus_events(id, event_name, category, event_date, venue, status)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(registration) {
    const { data, error } = await supabase
      .from('event_registrations')
      .insert([registration])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('event_registrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/**
 * Team Results Service
 */
export const teamResultsService = {
  async getByEvent(eventId) {
    const { data, error } = await supabase
      .from('team_results')
      .select('*')
      .eq('event_id', eventId)
      .order('winner_position', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAll() {
    const { data, error } = await supabase
      .from('team_results')
      .select(`
        *,
        event:campus_events(id, event_name, category, event_date)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsert(result) {
    const { data, error } = await supabase
      .from('team_results')
      .upsert([result], { onConflict: 'event_id,winner_position' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

/**
 * Event Certificates Service
 */
export const eventCertificatesService = {
  async issue(certificate) {
    const { data, error } = await supabase
      .from('event_certificates')
      .insert([certificate])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByUser(userId) {
    const { data, error } = await supabase
      .from('event_certificates')
      .select(`
        *,
        event:campus_events(id, event_name, category, event_date)
      `)
      .eq('participant_user_id', userId)
      .order('issued_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};

/**
 * Users Service
 */
export const usersService = {
  async getById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async create(user) {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select();
    if (error) throw error;
    return data[0];
  },

  async upsert(user) {
    const { data, error } = await supabase
      .from('users')
      .upsert([user], { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data[0];
  },

  async update(id, user) {
    const { data, error } = await supabase
      .from('users')
      .update(user)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByRole(role) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};

export const fundAllocationsService = {
  async getAll() {
    const { data, error } = await supabase.from('fund_allocations').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('fund_allocations').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const fundUsageLogsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('fund_usage_logs')
      .select('*, event:campus_events(id, event_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('fund_usage_logs').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const conflictTicketsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('conflict_tickets')
      .select('*, event:campus_events(id, event_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('conflict_tickets').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('conflict_tickets').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};

export const eventJudgeAssignmentsService = {
  async getByEvent(eventId) {
    const { data, error } = await supabase
      .from('event_judge_assignments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('event_judge_assignments').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const liveScoresService = {
  async getByEvent(eventId) {
    const { data, error } = await supabase.from('live_scores').select('*').eq('event_id', eventId).order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async upsert(payload) {
    const { data, error } = await supabase.from('live_scores').upsert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const groundBookingsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('ground_bookings')
      .select('*, event:campus_events(id, event_name)')
      .order('booked_for', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('ground_bookings').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const magazineArticlesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('magazine_articles')
      .select('*, author:users(id, full_name, email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('magazine_articles').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('magazine_articles').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};

export const magazineCommentsService = {
  async getByArticle(articleId) {
    const { data, error } = await supabase
      .from('magazine_comments')
      .select('*, user:users(id, full_name, email)')
      .eq('article_id', articleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('magazine_comments').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('magazine_comments').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};

export const blockchainHashLogsService = {
  async getAll() {
    const { data, error } = await supabase.from('blockchain_hash_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('blockchain_hash_logs').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const approvalLogsService = {
  async getAll() {
    const { data, error } = await supabase.from('approval_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('approval_logs').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const activityLogsService = {
  async getAll() {
    const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('activity_logs').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const studentGrievancesService = {
  async getByStudent(studentId) {
    const { data, error } = await supabase.from('student_grievances').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('student_grievances').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const studentSuggestionsService = {
  async getAll() {
    const { data, error } = await supabase.from('student_suggestions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('student_suggestions').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

export const achievementWalletService = {
  async getByUser(userId) {
    const { data, error } = await supabase.from('achievement_wallet').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async add(payload) {
    const { data, error } = await supabase.from('achievement_wallet').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }
};

/**
 * Storage Service for file uploads
 */
export const storageService = {
  async uploadImage(file, bucket = 'event-posters', path) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async deleteImage(url, bucket = 'event-posters') {
    // Extract path from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const path = urlParts.slice(-2).join('/'); // assuming bucket/filename

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }
};

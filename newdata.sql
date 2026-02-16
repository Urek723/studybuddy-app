-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLES

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  school TEXT,
  year_level TEXT,
  major TEXT,
  interests TEXT[],
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_days TEXT[],
  schedule_time_start TIME,
  schedule_time_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);

CREATE TABLE public.user_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time),
  UNIQUE(user_id, day_of_week, start_time, end_time)
);

CREATE TABLE public.study_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  max_members INTEGER DEFAULT 10 CHECK (max_members > 0),
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.study_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE TABLE public.session_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE TABLE public.session_reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE TABLE public.quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  time_limit INTEGER CHECK (time_limit IS NULL OR time_limit > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.quiz_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 10 CHECK (points > 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.quiz_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_answer INTEGER,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.study_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE SET NULL,
  study_hours DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (study_hours >= 0),
  participation_points INTEGER NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.game_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('tictactoe', 'rockpaperscissors', 'memory', 'quickmath', 'speedchallenge')),
  score INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL CHECK (mode IN ('solo', 'multiplayer')),
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  game_data JSONB DEFAULT NULL,
  CONSTRAINT positive_score CHECK (score >= 0)
);

-- INDEXES

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_completed ON public.profiles(profile_completed);
CREATE INDEX idx_user_subjects_user_id ON public.user_subjects(user_id);
CREATE INDEX idx_user_subjects_subject_id ON public.user_subjects(subject_id);
CREATE INDEX idx_user_subjects_primary ON public.user_subjects(user_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_user_availability_user_id ON public.user_availability(user_id);
CREATE INDEX idx_user_availability_day ON public.user_availability(day_of_week);
CREATE INDEX idx_user_availability_time ON public.user_availability(start_time, end_time);
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_members_status ON public.group_members(group_id, status);
CREATE INDEX idx_study_groups_subject ON public.study_groups(subject_id);
CREATE INDEX idx_study_groups_created_at ON public.study_groups(created_at DESC);
CREATE INDEX idx_messages_group_id ON public.messages(group_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_study_sessions_group_id ON public.study_sessions(group_id);
CREATE INDEX idx_study_sessions_start_time ON public.study_sessions(start_time);
CREATE INDEX idx_study_sessions_created_by ON public.study_sessions(created_by);
CREATE INDEX idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON public.session_participants(user_id);
CREATE INDEX idx_quizzes_group_id ON public.quizzes(group_id);
CREATE INDEX idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_answers_attempt_id ON public.quiz_answers(attempt_id);
CREATE INDEX idx_study_progress_user_id ON public.study_progress(user_id);
CREATE INDEX idx_study_progress_logged_at ON public.study_progress(logged_at DESC);
CREATE INDEX idx_study_progress_user_group ON public.study_progress(user_id, group_id);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

CREATE INDEX idx_game_scores_user       ON game_scores(user_id);
CREATE INDEX idx_game_scores_group      ON game_scores(group_id);
CREATE INDEX idx_game_scores_type       ON game_scores(game_type);
CREATE INDEX idx_game_scores_played_at  ON game_scores(played_at DESC);
CREATE INDEX idx_game_scores_group_type ON game_scores(group_id, game_type);
CREATE INDEX idx_game_scores_user_group ON game_scores(user_id, group_id);

-- FUNCTIONS

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_group_id(p_quiz_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT group_id FROM public.quizzes WHERE id = p_quiz_id;
$$;

CREATE OR REPLACE FUNCTION public.get_session_group_id(p_session_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT group_id FROM public.study_sessions WHERE id = p_session_id;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_game_leaderboard(
  p_group_id UUID,
  p_game_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  best_score INTEGER,
  total_score INTEGER,
  games_played INTEGER,
  rank INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH ranked_scores AS (
    SELECT
      gs.user_id,
      p.full_name,
      p.avatar_url,
      MAX(gs.score) as best_score,
      SUM(gs.score) as total_score,
      COUNT(*)::INTEGER as games_played,
      ROW_NUMBER() OVER (ORDER BY MAX(gs.score) DESC) as rank
    FROM game_scores gs
    JOIN profiles p ON p.id = gs.user_id
    WHERE gs.group_id = p_group_id
      AND (p_game_type IS NULL OR gs.game_type = p_game_type)
      AND EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid() AND gm.status = 'accepted'
      )
    GROUP BY gs.user_id, p.full_name, p.avatar_url
    ORDER BY best_score DESC LIMIT p_limit
  )
  SELECT * FROM ranked_scores;
END;
$$;

CREATE OR REPLACE FUNCTION get_overall_leaderboard(
  p_group_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  total_score INTEGER,
  games_played INTEGER,
  rank INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH combined_scores AS (
    SELECT gs.user_id, gs.score FROM game_scores gs WHERE gs.group_id = p_group_id
    UNION ALL
    SELECT qa.user_id, qa.score FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id
    WHERE q.group_id = p_group_id AND qa.completed_at IS NOT NULL
  ),
  aggregated AS (
    SELECT
      cs.user_id,
      p.full_name,
      p.avatar_url,
      SUM(cs.score)::INTEGER as total_score,
      COUNT(*)::INTEGER as games_played
    FROM combined_scores cs
    JOIN profiles p ON p.id = cs.user_id
    WHERE EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid() AND gm.status = 'accepted'
    )
    GROUP BY cs.user_id, p.full_name, p.avatar_url
  )
  SELECT
    a.*,
    ROW_NUMBER() OVER (ORDER BY a.total_score DESC)::INTEGER as rank
  FROM aggregated a
  ORDER BY total_score DESC
  LIMIT p_limit;
END;
$$;

-- TRIGGERS

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS ENABLE

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- subjects
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subjects_insert" ON public.subjects FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- user_subjects
CREATE POLICY "user_subjects_select" ON public.user_subjects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_subjects_insert" ON public.user_subjects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_subjects_update" ON public.user_subjects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_subjects_delete" ON public.user_subjects FOR DELETE USING (user_id = auth.uid());

-- user_availability
CREATE POLICY "user_availability_select" ON public.user_availability FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_availability_insert" ON public.user_availability FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_availability_update" ON public.user_availability FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_availability_delete" ON public.user_availability FOR DELETE USING (user_id = auth.uid());

-- study_groups
CREATE POLICY "study_groups_select" ON public.study_groups FOR SELECT USING (true);
CREATE POLICY "study_groups_insert" ON public.study_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "study_groups_update" ON public.study_groups FOR UPDATE USING (auth.uid() = created_by OR is_group_admin(id));
CREATE POLICY "study_groups_delete" ON public.study_groups FOR DELETE USING (auth.uid() = created_by);

-- group_members
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "group_members_update" ON public.group_members FOR UPDATE USING (auth.uid() = user_id OR is_group_admin(group_id));
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE USING (auth.uid() = user_id OR is_group_admin(group_id));

-- messages
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id AND is_group_member(group_id));
CREATE POLICY "messages_update" ON public.messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "messages_delete" ON public.messages FOR DELETE USING (auth.uid() = user_id OR is_group_admin(group_id));

-- study_sessions
CREATE POLICY "study_sessions_select" ON public.study_sessions FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "study_sessions_insert" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = created_by AND is_group_member(group_id));
CREATE POLICY "study_sessions_update" ON public.study_sessions FOR UPDATE USING (auth.uid() = created_by OR is_group_admin(group_id));
CREATE POLICY "study_sessions_delete" ON public.study_sessions FOR DELETE USING (auth.uid() = created_by OR is_group_admin(group_id));

-- session_participants
CREATE POLICY "session_participants_select" ON public.session_participants FOR SELECT USING (auth.uid() = user_id OR is_group_member(get_session_group_id(session_id)));
CREATE POLICY "session_participants_insert" ON public.session_participants FOR INSERT WITH CHECK (auth.uid() = user_id OR is_group_admin(get_session_group_id(session_id)));
CREATE POLICY "session_participants_update" ON public.session_participants FOR UPDATE USING (auth.uid() = user_id OR is_group_admin(get_session_group_id(session_id)));
CREATE POLICY "session_participants_delete" ON public.session_participants FOR DELETE USING (auth.uid() = user_id);

-- session_reminders
CREATE POLICY "session_reminders_select" ON public.session_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "session_reminders_insert" ON public.session_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "session_reminders_update" ON public.session_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "session_reminders_delete" ON public.session_reminders FOR DELETE USING (auth.uid() = user_id);

-- quizzes
CREATE POLICY "quizzes_select" ON public.quizzes FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "quizzes_insert" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = created_by AND is_group_member(group_id));
CREATE POLICY "quizzes_update" ON public.quizzes FOR UPDATE USING (auth.uid() = created_by OR is_group_admin(group_id));
CREATE POLICY "quizzes_delete" ON public.quizzes FOR DELETE USING (auth.uid() = created_by OR is_group_admin(group_id));

-- quiz_questions
CREATE POLICY "quiz_questions_select" ON public.quiz_questions FOR SELECT USING (is_group_member(get_quiz_group_id(quiz_id)));
CREATE POLICY "quiz_questions_insert" ON public.quiz_questions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()));
CREATE POLICY "quiz_questions_update" ON public.quiz_questions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()));
CREATE POLICY "quiz_questions_delete" ON public.quiz_questions FOR DELETE USING (EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()));

-- quiz_attempts
CREATE POLICY "quiz_attempts_select" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id OR is_group_admin(get_quiz_group_id(quiz_id)));
CREATE POLICY "quiz_attempts_insert" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id AND is_group_member(get_quiz_group_id(quiz_id)));
CREATE POLICY "quiz_attempts_update" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- quiz_answers
CREATE POLICY "quiz_answers_select" ON public.quiz_answers FOR SELECT USING (EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.id = attempt_id AND qa.user_id = auth.uid()));
CREATE POLICY "quiz_answers_insert" ON public.quiz_answers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.id = attempt_id AND qa.user_id = auth.uid()));

-- study_progress
CREATE POLICY "study_progress_select" ON public.study_progress FOR SELECT USING (auth.uid() = user_id OR (group_id IS NOT NULL AND is_group_member(group_id)));
CREATE POLICY "study_progress_insert" ON public.study_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_progress_update" ON public.study_progress FOR UPDATE USING (auth.uid() = user_id);

-- achievements
CREATE POLICY "achievements_select" ON public.achievements FOR SELECT USING (true);

-- user_achievements
CREATE POLICY "user_achievements_select" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_insert" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- game_scores
CREATE POLICY "Users can view game scores in their groups" ON game_scores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = game_scores.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.status = 'accepted'
  )
);

CREATE POLICY "Users can submit their own game scores" ON game_scores FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = game_scores.group_id
    AND group_members.user_id = auth.uid()
    AND group_members.status = 'accepted'
  )
);

CREATE POLICY "Users can update their own game scores" ON game_scores FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game scores" ON game_scores FOR DELETE USING (auth.uid() = user_id);
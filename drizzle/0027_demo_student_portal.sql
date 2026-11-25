-- Student portal integration tables for Sera Demo University (sera-demo).
-- Additive and idempotent: stores attendance, assignments, and weekly
-- timetable records so live demonstrations read real Postgres/Supabase rows.

CREATE TABLE IF NOT EXISTS "student_attendance" (
  "id" varchar(191) PRIMARY KEY NOT NULL,
  "college" varchar(32) NOT NULL,
  "user_id" varchar(255),
  "course_code" varchar(32) NOT NULL,
  "course_name" text NOT NULL,
  "faculty" text,
  "attended_classes" integer NOT NULL,
  "total_classes" integer NOT NULL,
  "minimum_required_pct" integer DEFAULT 75 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_attendance_college_user_idx"
  ON "student_attendance" ("college", "user_id");
--> statement-breakpoint
ALTER TABLE "student_attendance" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_attendance'
      AND policyname = 'student_attendance_read'
  ) THEN
    CREATE POLICY "student_attendance_read"
      ON "student_attendance"
      AS PERMISSIVE
      FOR SELECT
      TO public
      USING ("user_id" IS NULL OR "user_id" = (select current_setting('app.current_user_id', true)));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_attendance'
      AND policyname = 'student_attendance_mentor_manage'
  ) THEN
    CREATE POLICY "student_attendance_mentor_manage"
      ON "student_attendance"
      AS PERMISSIVE
      FOR ALL
      TO public
      USING (
        (select current_setting('app.rag_system_write', true)) = 'true'
        OR EXISTS (
          SELECT 1 FROM "user_profiles"
          WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true))
            AND "user_profiles"."user_type" = 'mentor'
            AND "user_profiles"."college" = "student_attendance"."college"
        )
      )
      WITH CHECK (
        (select current_setting('app.rag_system_write', true)) = 'true'
        OR EXISTS (
          SELECT 1 FROM "user_profiles"
          WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true))
            AND "user_profiles"."user_type" = 'mentor'
            AND "user_profiles"."college" = "student_attendance"."college"
        )
      );
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "student_assignments" (
  "id" varchar(191) PRIMARY KEY NOT NULL,
  "college" varchar(32) NOT NULL,
  "user_id" varchar(255),
  "course_code" varchar(32) NOT NULL,
  "course_name" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "due_at" timestamp with time zone,
  "relative_due_slot" varchar(32),
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "estimated_minutes" integer,
  "submission_portal_url" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_assignments_college_user_idx"
  ON "student_assignments" ("college", "user_id");
--> statement-breakpoint
ALTER TABLE "student_assignments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_assignments'
      AND policyname = 'student_assignments_read'
  ) THEN
    CREATE POLICY "student_assignments_read"
      ON "student_assignments"
      AS PERMISSIVE
      FOR SELECT
      TO public
      USING ("user_id" IS NULL OR "user_id" = (select current_setting('app.current_user_id', true)));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_assignments'
      AND policyname = 'student_assignments_mentor_manage'
  ) THEN
    CREATE POLICY "student_assignments_mentor_manage"
      ON "student_assignments"
      AS PERMISSIVE
      FOR ALL
      TO public
      USING (
        (select current_setting('app.rag_system_write', true)) = 'true'
        OR EXISTS (
          SELECT 1 FROM "user_profiles"
          WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true))
            AND "user_profiles"."user_type" = 'mentor'
            AND "user_profiles"."college" = "student_assignments"."college"
        )
      )
      WITH CHECK (
        (select current_setting('app.rag_system_write', true)) = 'true'
        OR EXISTS (
          SELECT 1 FROM "user_profiles"
          WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true))
            AND "user_profiles"."user_type" = 'mentor'
            AND "user_profiles"."college" = "student_assignments"."college"
        )
      );
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "student_timetable" (
  "id" varchar(191) PRIMARY KEY NOT NULL,
  "college" varchar(32) NOT NULL,
  "user_id" varchar(255),
  "day_of_week" integer NOT NULL,
  "start_time" varchar(16) NOT NULL,
  "end_time" varchar(16) NOT NULL,
  "course_code" varchar(32) NOT NULL,
  "course_name" text NOT NULL,
  "session_type" varchar(32) DEFAULT 'Lecture' NOT NULL,
  "room" text NOT NULL,
  "faculty" text,
  "sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_timetable_college_user_day_idx"
  ON "student_timetable" ("college", "user_id", "day_of_week");
--> statement-breakpoint
ALTER TABLE "student_timetable" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_timetable'
      AND policyname = 'student_timetable_read'
  ) THEN
    CREATE POLICY "student_timetable_read"
      ON "student_timetable"
      AS PERMISSIVE
      FOR SELECT
      TO public
      USING ("user_id" IS NULL OR "user_id" = (select current_setting('app.current_user_id', true)));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_timetable'
      AND policyname = 'student_timetable_mentor_manage'
  ) THEN
    CREATE POLICY "student_timetable_mentor_manage"
      ON "student_timetable"
      AS PERMISSIVE
      FOR ALL
      TO public
      USING (
        (select current_setting('app.rag_system_write', true)) = 'true'
        OR EXISTS (
          SELECT 1 FROM "user_profiles"
          WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true))
            AND "user_profiles"."user_type" = 'mentor'
            AND "user_profiles"."college" = "student_timetable"."college"
        )
      )
      WITH CHECK (
        (select current_setting('app.rag_system_write', true)) = 'true'
        OR EXISTS (
          SELECT 1 FROM "user_profiles"
          WHERE "user_profiles"."id" = (select current_setting('app.current_user_id', true))
            AND "user_profiles"."user_type" = 'mentor'
            AND "user_profiles"."college" = "student_timetable"."college"
        )
      );
  END IF;
END $$;
--> statement-breakpoint

-- Fictional Sera Demo University (sera-demo) student portal records
INSERT INTO "student_attendance" (
  "id", "college", "user_id", "course_code", "course_name", "faculty",
  "attended_classes", "total_classes", "minimum_required_pct", "sort_order"
) VALUES
  ('att_sera-demo_cs201', 'sera-demo', NULL, 'CS201', 'Data Structures', 'Prof. Ananya Rao', 32, 36, 75, 1),
  ('att_sera-demo_ma203', 'sera-demo', NULL, 'MA203', 'Discrete Mathematics', 'Dr. Vikram Sethi', 25, 32, 75, 2),
  ('att_sera-demo_cs205', 'sera-demo', NULL, 'CS205', 'Computer Organisation', 'Prof. Rajesh Nair', 20, 28, 75, 3),
  ('att_sera-demo_cs207', 'sera-demo', NULL, 'CS207', 'Object Oriented Programming', 'Dr. Meera Kulkarni', 27, 32, 75, 4),
  ('att_sera-demo_cs201l', 'sera-demo', NULL, 'CS201L', 'Data Structures Lab', 'Prof. Ananya Rao', 12, 13, 75, 5)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "student_assignments" (
  "id", "college", "user_id", "course_code", "course_name", "title",
  "description", "due_at", "relative_due_slot", "status",
  "estimated_minutes", "submission_portal_url", "sort_order"
) VALUES
  ('asg_sera-demo_ma203_ps4', 'sera-demo', NULL, 'MA203', 'Discrete Mathematics',
   'Problem Set 4: Graph Theory & Trees',
   'Proofs and traversal problems on spanning trees and bipartite graphs.',
   NULL, 'yesterday_night', 'submitted', 45,
   'https://sera-demo.example/portal/assignments/ma203-ps4', 1),
  ('asg_sera-demo_cs201l_lab5', 'sera-demo', NULL, 'CS201L', 'Data Structures Lab',
   'Lab 5: AVL Tree Implementation & Rotation Benchmarks',
   'Implement self-balancing AVL insert/delete in C++ and upload rotation timing plots.',
   NULL, 'before_friday_early', 'pending', 90,
   'https://sera-demo.example/portal/assignments/cs201l-lab5', 2),
  ('asg_sera-demo_cs205_hw3', 'sera-demo', NULL, 'CS205', 'Computer Organisation',
   'Assignment 3: Pipeline Hazard Analysis',
   'Resolve data and control hazards using forwarding and branch prediction diagrams.',
   NULL, 'before_friday_late', 'in_progress', 60,
   'https://sera-demo.example/portal/assignments/cs205-hw3', 3),
  ('asg_sera-demo_cs207_rep4', 'sera-demo', NULL, 'CS207', 'Object Oriented Programming',
   'Lab Report 4: Strategy & Observer Design Patterns',
   'Refactor the campus notification demo using Strategy and Observer interfaces with unit tests.',
   NULL, 'friday_evening', 'pending', 60,
   'https://sera-demo.example/portal/assignments/cs207-rep4', 4),
  ('asg_sera-demo_ma203_hw5', 'sera-demo', NULL, 'MA203', 'Discrete Mathematics',
   'Assignment 5: Recurrence Relations & Generating Functions',
   'Solve linear homogeneous recurrences and derive closed-form generating functions.',
   NULL, 'next_week', 'pending', 75,
   'https://sera-demo.example/portal/assignments/ma203-hw5', 5)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "student_timetable" (
  "id", "college", "user_id", "day_of_week", "start_time", "end_time",
  "course_code", "course_name", "session_type", "room", "faculty", "sort_order"
) VALUES
  ('tt_sera-demo_1_1', 'sera-demo', NULL, 1, '09:00', '10:00', 'CS201', 'Data Structures', 'Lecture', 'Room LH-204', 'Prof. Ananya Rao', 1),
  ('tt_sera-demo_1_2', 'sera-demo', NULL, 1, '10:15', '11:15', 'MA203', 'Discrete Mathematics', 'Lecture', 'Room LH-108', 'Dr. Vikram Sethi', 2),
  ('tt_sera-demo_1_3', 'sera-demo', NULL, 1, '11:30', '12:30', 'CS205', 'Computer Organisation', 'Lecture', 'Room LH-204', 'Prof. Rajesh Nair', 3),
  ('tt_sera-demo_1_4', 'sera-demo', NULL, 1, '14:00', '16:00', 'CS201L', 'Data Structures Lab', 'Lab', 'Programming Lab 2', 'Prof. Ananya Rao', 4),
  ('tt_sera-demo_2_1', 'sera-demo', NULL, 2, '09:00', '10:00', 'CS207', 'Object Oriented Programming', 'Lecture', 'Room LH-202', 'Dr. Meera Kulkarni', 1),
  ('tt_sera-demo_2_2', 'sera-demo', NULL, 2, '10:15', '11:15', 'CS205', 'Computer Organisation', 'Lecture', 'Room LH-204', 'Prof. Rajesh Nair', 2),
  ('tt_sera-demo_2_3', 'sera-demo', NULL, 2, '11:30', '12:30', 'MA203', 'Discrete Mathematics', 'Tutorial', 'Room TR-105', 'Dr. Vikram Sethi', 3),
  ('tt_sera-demo_2_4', 'sera-demo', NULL, 2, '14:00', '15:30', 'CS207', 'Object Oriented Programming', 'Lab', 'Software Lab 1', 'Dr. Meera Kulkarni', 4),
  ('tt_sera-demo_3_1', 'sera-demo', NULL, 3, '09:00', '10:00', 'CS201', 'Data Structures', 'Lecture', 'Room LH-204', 'Prof. Ananya Rao', 1),
  ('tt_sera-demo_3_2', 'sera-demo', NULL, 3, '10:15', '11:15', 'CS207', 'Object Oriented Programming', 'Lecture', 'Room LH-202', 'Dr. Meera Kulkarni', 2),
  ('tt_sera-demo_3_3', 'sera-demo', NULL, 3, '11:30', '12:30', 'CS205', 'Computer Organisation', 'Tutorial', 'Room TR-102', 'Prof. Rajesh Nair', 3),
  ('tt_sera-demo_3_4', 'sera-demo', NULL, 3, '15:00', '16:00', 'MA203', 'Discrete Mathematics', 'Lecture', 'Room LH-108', 'Dr. Vikram Sethi', 4),
  ('tt_sera-demo_4_1', 'sera-demo', NULL, 4, '09:00', '10:00', 'CS205', 'Computer Organisation', 'Lecture', 'Room LH-204', 'Prof. Rajesh Nair', 1),
  ('tt_sera-demo_4_2', 'sera-demo', NULL, 4, '10:15', '11:15', 'CS201', 'Data Structures', 'Lecture', 'Room LH-204', 'Prof. Ananya Rao', 2),
  ('tt_sera-demo_4_3', 'sera-demo', NULL, 4, '11:30', '12:30', 'MA203', 'Discrete Mathematics', 'Lecture', 'Room LH-108', 'Dr. Vikram Sethi', 3),
  ('tt_sera-demo_4_4', 'sera-demo', NULL, 4, '14:00', '16:00', 'CS201L', 'Data Structures Lab', 'Lab', 'Programming Lab 2', 'Prof. Ananya Rao', 4),
  ('tt_sera-demo_5_1', 'sera-demo', NULL, 5, '09:00', '10:00', 'CS207', 'Object Oriented Programming', 'Lecture', 'Room LH-202', 'Dr. Meera Kulkarni', 1),
  ('tt_sera-demo_5_2', 'sera-demo', NULL, 5, '10:15', '11:15', 'CS201', 'Data Structures', 'Tutorial', 'Room TR-105', 'Prof. Ananya Rao', 2),
  ('tt_sera-demo_5_3', 'sera-demo', NULL, 5, '11:30', '12:30', 'CS205', 'Computer Organisation', 'Lecture', 'Room LH-204', 'Prof. Rajesh Nair', 3),
  ('tt_sera-demo_5_4', 'sera-demo', NULL, 5, '14:00', '15:00', 'CS207', 'Object Oriented Programming', 'Lab', 'Software Lab 1', 'Dr. Meera Kulkarni', 4),
  ('tt_sera-demo_6_1', 'sera-demo', NULL, 6, '09:30', '10:30', 'MA203', 'Discrete Mathematics', 'Problem Solving', 'Room LH-108', 'Dr. Vikram Sethi', 1),
  ('tt_sera-demo_6_2', 'sera-demo', NULL, 6, '10:45', '11:45', 'CS201', 'Data Structures', 'Mentoring & Doubt Session', 'Room TR-102', 'Prof. Ananya Rao', 2)
ON CONFLICT ("id") DO NOTHING;

-- Configure the authentic student Google domain for B.K. Birla College.
-- Additive and idempotent: only updates when student_domains is still empty.
UPDATE "colleges"
SET "student_domains" = ARRAY['bkbck.edu.in']::text[],
    "updated_at" = now()
WHERE "slug" = 'bkbirla'
  AND cardinality("student_domains") = 0;

WITH target_faculties AS (
  SELECT id
  FROM academy_faculties
  WHERE name = 'OroActive Academy'
),
deleted_courses AS (
  DELETE FROM courses
  WHERE COALESCE(metadata->>'courseCode', '') = 'ORO-MASTER-001'
     OR COALESCE(metadata->>'goldMaster', '') = 'true'
     OR title = 'Oro Master — Dalla Bilancia d’Oro'
  RETURNING id
),
detached_courses AS (
  UPDATE courses
  SET faculty_id = NULL
  WHERE faculty_id IN (SELECT id FROM target_faculties)
  RETURNING id
),
detached_academy_courses AS (
  UPDATE academy_courses
  SET faculty_id = NULL
  WHERE faculty_id IN (SELECT id FROM target_faculties)
  RETURNING id
)
DELETE FROM academy_faculties
WHERE id IN (SELECT id FROM target_faculties);

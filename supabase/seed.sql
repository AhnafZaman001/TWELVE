-- TWELVE: starting data for the first school.
-- Run once after 0001_init.sql. Staff are placeholders: replace them with real
-- names in the Supabase Table Editor (never commit real names to the repo).

insert into schools (slug, name) values ('main', 'My School');

-- Rooms K-0 to K-50; rooms with a section hold a test.
with sections(code, section) as (values
  ('K-4','F-1A'),('K-5','F-1B'),('K-6','F-2'),('K-7','F-3'),('K-3','F-5'),('K-2','F-6'),
  ('K-1','F-7'),('K-11','F-8'),('K-9','F-9'),('K-14','F-10'),('K-15','F-11'),('K-16','F-12'),
  ('K-13','F-13'),('K-10','F-14'),('K-8','F-15'),('K-44','F-16'),
  ('K-39','S1A'),('K-40','S1B'),('K-43','S2'),('K-50','S3'),('K-49','S4'),('K-27','S6'),
  ('K-23','S7'),('K-25','S8'),('K-28','S9'),('K-32','S10'),('K-45','S11'),('K-46','S12'),
  ('K-22','S13'),('K-29','S14'),('K-31','S15'),('K-48','S16')
)
insert into rooms (school_id, code, section, is_test_room, sort)
select s.id, 'K-' || n, sec.section, sec.section is not null, n
from schools s
cross join generate_series(0, 50) as n
left join sections sec on sec.code = 'K-' || n
where s.slug = 'main';

insert into checks (school_id, slug, round, audience, instruction, question, sort)
select s.id, c.slug, c.round, c.audience, c.instruction, c.question, c.sort
from schools s, (values
  ('whiteboard',   1, 'invigilator',    'Look at the whiteboard.',
   'Is the whiteboard written (subject, date, time, instructions)?', 1),
  ('seating',      1, 'both',           'Walk once around the room.',
   'Is the seating arranged as per plan?', 2),
  ('ab-papers',    1, 'both',           'Look at the papers of two students sitting side by side.',
   'Are A/B papers distributed properly?', 3),
  ('margin',       2, 'both',           'Tell students to draw margin lines. Then look at 5 answer sheets in the back row.',
   'Have you told students about margin lines?', 4),
  ('underlining',  2, 'both',           'Remind students to underline key points.',
   'Have you told students about underlining?', 5),
  ('highlighting', 2, 'both',           'Remind students to highlight headings.',
   'Have you told students about highlighting?', 6),
  ('lagging',      2, 'floor_incharge', 'Ask the invigilator which students are falling behind.',
   'Have you informed the teacher about students who are lagging?', 7)
) as c(slug, round, audience, instruction, question, sort)
where s.slug = 'main';

insert into staff (school_id, full_name, role)
select s.id, 'Teacher ' || lpad(n::text, 2, '0'), 'teacher'
from schools s, generate_series(1, 30) as n
where s.slug = 'main';

insert into staff (school_id, full_name, role)
select s.id, 'Floor Incharge ' || x, 'floor_incharge'
from schools s, unnest(array['A', 'B', 'C']) as x
where s.slug = 'main';

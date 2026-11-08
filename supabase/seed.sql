-- TWELVE: starting data for the first school. These are ordinary rows:
-- edit, add or delete any of them later from the admin screen.
-- Staff are placeholders; add real names in the app (never in this repo).

insert into schools (slug, name) values ('main', 'My School');

insert into groups (school_id, name, sort)
select id, g.name, g.sort from schools, (values ('1st Year', 1), ('2nd Year', 2)) as g(name, sort)
where slug = 'main';

insert into rooms (school_id, code, sort)
select id, 'K-' || n, n from schools, generate_series(0, 50) as n
where slug = 'main';

with placed(room, section, grp, sort) as (values
  ('K-4','F-1A','1st Year',1),('K-5','F-1B','1st Year',2),('K-6','F-2','1st Year',3),
  ('K-7','F-3','1st Year',4),('K-3','F-5','1st Year',5),('K-2','F-6','1st Year',6),
  ('K-1','F-7','1st Year',7),('K-11','F-8','1st Year',8),('K-9','F-9','1st Year',9),
  ('K-14','F-10','1st Year',10),('K-15','F-11','1st Year',11),('K-16','F-12','1st Year',12),
  ('K-13','F-13','1st Year',13),('K-10','F-14','1st Year',14),('K-8','F-15','1st Year',15),
  ('K-44','F-16','1st Year',16),
  ('K-39','S1A','2nd Year',17),('K-40','S1B','2nd Year',18),('K-43','S2','2nd Year',19),
  ('K-50','S3','2nd Year',20),('K-49','S4','2nd Year',21),('K-27','S6','2nd Year',22),
  ('K-23','S7','2nd Year',23),('K-25','S8','2nd Year',24),('K-28','S9','2nd Year',25),
  ('K-32','S10','2nd Year',26),('K-45','S11','2nd Year',27),('K-46','S12','2nd Year',28),
  ('K-22','S13','2nd Year',29),('K-29','S14','2nd Year',30),('K-31','S15','2nd Year',31),
  ('K-48','S16','2nd Year',32)
)
insert into sections (school_id, name, group_id, room_id, sort)
select s.id, p.section, g.id, r.id, p.sort
from placed p
join schools s on s.slug = 'main'
join groups g on g.school_id = s.id and g.name = p.grp
join rooms r on r.school_id = s.id and r.code = p.room;

insert into rounds (school_id, name, start_time, counts_kind, sort)
select id, r.name, r.start_time, r.counts_kind, r.sort
from schools, (values
  ('Start of test', '07:50', 'attendance', 1),
  ('Mid-test',      '08:15', 'non_attempting', 2)
) as r(name, start_time, counts_kind, sort)
where slug = 'main';

insert into checks (school_id, round_id, audience, instruction, question, sort)
select s.id, r.id, c.audience, c.instruction, c.question, c.sort
from schools s
join (values
  ('Start of test', 'invigilator', 'Look at the whiteboard.',
   'Is the whiteboard written (subject, date, time, instructions)?', 1),
  ('Start of test', 'both', 'Walk once around the room.',
   'Is the seating arranged as per plan?', 2),
  ('Start of test', 'both', 'Look at the papers of two students sitting side by side.',
   'Are A/B papers distributed properly?', 3),
  ('Mid-test', 'both', 'Tell students to draw margin lines. Then look at 5 answer sheets in the back row.',
   'Have you told students about margin lines?', 4),
  ('Mid-test', 'both', 'Remind students to underline key points.',
   'Have you told students about underlining?', 5),
  ('Mid-test', 'both', 'Remind students to highlight headings.',
   'Have you told students about highlighting?', 6),
  ('Mid-test', 'floor_incharge', 'Ask the invigilator which students are falling behind.',
   'Have you informed the teacher about students who are lagging?', 7)
) as c(round_name, audience, instruction, question, sort) on true
join rounds r on r.school_id = s.id and r.name = c.round_name
where s.slug = 'main';

insert into staff (school_id, full_name, role)
select id, 'Teacher ' || lpad(n::text, 2, '0'), 'teacher'
from schools, generate_series(1, 30) as n
where slug = 'main';

insert into staff (school_id, full_name, role)
select id, 'Floor Incharge ' || x, 'floor_incharge'
from schools, unnest(array['A', 'B', 'C']) as x
where slug = 'main';

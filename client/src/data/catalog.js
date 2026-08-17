export const GROUPS = [
  { id: 'anxiety', name: 'Anxiety Support Group', blurb: 'Weekly space for worry, panic, and everyday pressure.', tags: ['Anxiety', 'Adults'], when: 'Tuesdays 6:30pm ET', format: 'Virtual', concern: 'anxiety' },
  { id: 'depression', name: 'Depression & Mood Group', blurb: 'Steady company when energy and hope feel low.', tags: ['Depression', 'Adults'], when: 'Wednesdays 12:00pm ET', format: 'Virtual', concern: 'depression' },
  { id: 'grief', name: 'Grief Support Group', blurb: 'Loss, mourning, and learning to live alongside it.', tags: ['Grief'], when: 'Thursdays 7:00pm ET', format: 'Virtual + in-person', concern: 'grief' },
  { id: 'trauma', name: 'Trauma & PTSD Group', blurb: 'Pace-sensitive support after overwhelming experiences.', tags: ['Trauma', 'PTSD'], when: 'Mondays 5:30pm ET', format: 'Virtual', concern: 'trauma' },
  { id: 'adhd', name: 'ADHD Support Group', blurb: 'Focus, shame spirals, and systems that actually stick.', tags: ['ADHD', 'Neurodivergence'], when: 'Sundays 4:00pm ET', format: 'Virtual', concern: 'adhd' },
  { id: 'ocd', name: 'OCD Support Group', blurb: 'Intrusive thoughts, rituals, and reclaiming time.', tags: ['OCD'], when: 'Fridays 6:00pm ET', format: 'Virtual', concern: 'ocd' },
  { id: 'relationships', name: 'Relationships Group', blurb: 'Communication, conflict, and connection.', tags: ['Relationships'], when: 'Thursdays 6:00pm ET', format: 'Virtual', concern: 'relationships' },
  { id: 'divorce', name: 'Divorce & Separation Group', blurb: 'Practical and emotional support through a split.', tags: ['Life decisions'], when: 'Saturdays 10:00am ET', format: 'Virtual', concern: 'divorce' },
  { id: 'caregivers', name: 'Caregiver Stress Group', blurb: 'For people holding someone else’s care.', tags: ['Caregiving'], when: 'Wednesdays 7:30pm ET', format: 'Virtual', concern: 'caregivers' },
  { id: 'burnout', name: 'Work Burnout Group', blurb: 'Exhaustion, boundaries, and rebuilding a livable pace.', tags: ['Work'], when: 'Tuesdays 12:15pm ET', format: 'Virtual', concern: 'burnout' },
  { id: 'women', name: 'Women’s Circle', blurb: 'Women-only weekly sharing, therapist-facilitated.', tags: ['Women'], when: 'Mondays 7:00pm ET', format: 'In-person', concern: 'women' },
  { id: 'couples', name: 'Couples Skills Workshop', blurb: 'Six-week skills group for partners who want tools.', tags: ['Couples', 'Workshop'], when: 'Starts Sep 8', format: 'Virtual', concern: 'couples' },
];

export const ASSESSMENTS = [
  { id: 'anxiety', cat: 'Mental health', name: 'Anxiety check-in', blurb: 'A short reflection on worry, restlessness, and tension.', service: 'Anxiety & Stress' },
  { id: 'mood', cat: 'Mental health', name: 'Mood & energy check-in', blurb: 'Notice low mood, interest, and daily energy.', service: 'Depression & Mood' },
  { id: 'trauma', cat: 'Mental health', name: 'After something overwhelming', blurb: 'How your body and mind are responding since a hard event.', service: 'Trauma & Recovery' },
  { id: 'relationship', cat: 'Relationships', name: 'Relationship quality', blurb: 'Safety, repair, and whether the connection still feels mutual.', service: 'Relationships' },
  { id: 'breakup', cat: 'Relationships', name: 'After a breakup', blurb: 'Grief, identity, and how much the split is taking over the day.', service: 'Relationships' },
  { id: 'couples', cat: 'Relationships', name: 'Couples communication', blurb: 'Fight cycles, listening, and whether conversations go anywhere.', service: 'Relationships' },
  { id: 'burnout', cat: 'Work & life', name: 'Work burnout', blurb: 'Exhaustion, cynicism, and whether rest actually restores you.', service: 'Life Transitions' },
  { id: 'grief', cat: 'Work & life', name: 'Grief & loss', blurb: 'How loss is showing up in sleep, meaning, and connection.', service: 'Life Transitions' },
  { id: 'caregiving', cat: 'Work & life', name: 'Caregiving load', blurb: 'The hidden cost of looking after someone else.', service: 'Life Transitions' },
  { id: 'regulation', cat: 'Growth', name: 'Emotional regulation', blurb: 'How quickly feelings spike — and how you come back down.', service: 'Personal Growth' },
  { id: 'selfesteem', cat: 'Growth', name: 'Self-worth', blurb: 'Inner critic, comparison, and how you treat yourself.', service: 'Personal Growth' },
  { id: 'parenting', cat: 'Family', name: 'Parenting stress', blurb: 'Capacity, guilt, and support while raising kids or teens.', service: 'Life Transitions' },
];

export const ASSESS_Q = {
  anxiety: ['I feel on edge or unable to relax.', 'Worry is hard to turn off.', 'My body stays tense (jaw, chest, stomach).', 'I avoid things because they might spike anxiety.', 'Sleep is broken by racing thoughts.', 'I need extra reassurance to feel okay.'],
  mood: ['I have little interest in things I used to enjoy.', 'I feel down, empty, or hopeless.', 'Getting started on basic tasks takes huge effort.', 'I am harder on myself than I would be on a friend.', 'Rest does not restore me.', 'I pull away from people even when I want company.'],
  trauma: ['Reminders of what happened still hit hard.', 'I feel jumpy, numb, or both.', 'Sleep or nightmares are disrupted.', 'I avoid places, people, or talks linked to it.', 'I blame myself more than the facts support.', 'I feel unsafe even when I am physically safe.'],
  relationship: ['I can bring up hard topics without it exploding.', 'We repair after conflict.', 'I feel emotionally safe with this person.', 'Affection and effort feel reasonably mutual.', 'I walk on eggshells more than I want to admit.', 'I can be myself, not a managed version of me.'],
  breakup: ['Thoughts of the relationship take over my day.', 'I swing between missing them and being angry.', 'Daily routines (sleep, food, work) are off.', 'I feel unrecognizable to myself.', 'Contact or social media still hooks me.', 'I am not sure who I am without the relationship.'],
  couples: ['The same fight keeps looping.', 'One of us shuts down while the other pursues.', 'We listen to win more than to understand.', 'Appreciation has gone quiet.', 'Intimacy (emotional or physical) feels strained.', 'We still want to be on the same team.'],
  burnout: ['I feel exhausted even after time off.', 'Work leaves me cynical or numb.', 'Small requests feel like too much.', 'I have little left for people I care about.', 'I dread the start of the week.', 'I cannot remember the last time work felt meaningful.'],
  grief: ['Waves of missing them still knock me over.', 'The world feels muted or unreal.', 'I feel guilty for moments of okay-ness.', 'Anniversaries and reminders are especially hard.', 'People expect me to be “over it.”', 'I am not sure how to keep living a life that includes this loss.'],
  caregiving: ['I put their needs ahead of mine until I am depleted.', 'I feel resentful and then guilty for feeling it.', 'There is little backup if I get sick.', 'I have dropped hobbies, friends, or health care.', 'I am always “on.”', 'I do not know who I am besides the caregiver.'],
  regulation: ['Feelings go from 2 to 9 quickly.', 'Once upset, it takes a long time to come back.', 'I say or do things I regret in the heat of it.', 'I numb out with screens, food, or work.', 'Other people seem to handle the same stress more easily.', 'I want tools, not just insight.'],
  selfesteem: ['My inner critic runs the show.', 'I compare myself and come up short.', 'Compliments bounce off; criticism sticks.', 'I struggle to ask for what I need.', 'I feel like an imposter in rooms I earned.', 'Being kind to myself feels unnatural.'],
  parenting: ['I feel I am failing even when I am trying.', 'There is little adult backup.', 'I lose patience faster than I want.', 'I have no time that is just mine.', 'Worry about my child crowds out sleep.', 'I need a place to talk that is not “just venting to a partner.”'],
};

export const ASSESS_SCALE = ['Never', 'Sometimes', 'Often', 'Most days'];

export const THERAPISTS = [
  { name: 'Dr. Sarah Williams', title: 'Clinical Psychologist', specs: 'Anxiety · Trauma · Mood', img: '/therapist-1.jpg', focus: ['anxiety', 'trauma', 'teen'] },
  { name: 'James Chen, LCSW', title: 'Licensed Therapist', specs: 'Relationships · Life transitions', img: '/therapist-2.jpg', focus: ['couples', 'relationships'] },
  { name: 'Amira Patel, LPC', title: 'Counseling Specialist', specs: 'Stress · Personal growth', img: '/therapist-3.jpg', focus: ['anxiety', 'teen', 'growth'] },
];

export const GUIDES = [
  { id: 'anxiety', title: 'Understanding anxiety', blurb: 'What worry does in the body — and what therapy can change.' },
  { id: 'depression', title: 'Low mood & energy', blurb: 'When “just push through” stops working.' },
  { id: 'adhd', title: 'Living with ADHD', blurb: 'Focus, shame, and systems that stick.' },
  { id: 'ptsd', title: 'After trauma', blurb: 'Pace, safety, and reclaiming ordinary days.' },
  { id: 'grief', title: 'Grief that lingers', blurb: 'Mourning without a deadline.' },
  { id: 'ocd', title: 'Intrusive thoughts', blurb: 'Rituals, doubt loops, and getting time back.' },
];

export const RESOURCES = [
  { title: 'First session checklist', blurb: 'What to bring, what to ask, and how to leave with a next step.' },
  { title: 'Virtual visit setup', blurb: 'Quiet space, lighting, and how we keep sessions private.' },
  { title: 'Insurance & self-pay FAQ', blurb: 'What we verify before you start — no surprise “marketplace” fees.' },
  { title: 'Crisis resources (USA)', blurb: '911 and 988 when MindCare is not the right door.' },
];

/** Nav mega-menu config — each top item has columns of submenu links */
export const NAV_MENUS = [
  {
    id: 'groups',
    label: 'Support Groups',
    to: '/groups',
    columns: [
      {
        title: 'By concern',
        links: [
          { label: 'All support groups', to: '/groups' },
          { label: 'Anxiety', to: '/groups?concern=anxiety' },
          { label: 'Depression & mood', to: '/groups?concern=depression' },
          { label: 'Grief', to: '/groups?concern=grief' },
          { label: 'Trauma & PTSD', to: '/groups?concern=trauma' },
          { label: 'ADHD', to: '/groups?concern=adhd' },
          { label: 'OCD', to: '/groups?concern=ocd' },
          { label: 'Burnout', to: '/groups?concern=burnout' },
        ],
      },
      {
        title: 'By audience',
        links: [
          { label: 'Women’s circle', to: '/groups?concern=women' },
          { label: 'Couples workshop', to: '/groups?concern=couples' },
          { label: 'Caregivers', to: '/groups?concern=caregivers' },
          { label: 'Divorce & separation', to: '/groups?concern=divorce' },
          { label: 'Relationships', to: '/groups?concern=relationships' },
        ],
      },
    ],
    cta: { title: 'Not sure which group?', action: 'match', link: { label: 'Or take a short test →', to: '/assessments' } },
  },
  {
    id: 'therapy',
    label: 'Therapy',
    to: '/therapy',
    columns: [
      {
        title: '1-on-1 care',
        links: [
          { label: 'All therapists', to: '/therapy' },
          { label: 'Anxiety', to: '/therapy?focus=anxiety' },
          { label: 'Trauma', to: '/therapy?focus=trauma' },
          { label: 'Couples', to: '/therapy?focus=couples' },
          { label: 'Teens / family', to: '/therapy?focus=teen' },
          { label: 'Virtual sessions', to: '/therapy#formats' },
          { label: 'In-person sessions', to: '/therapy#formats' },
        ],
      },
      {
        title: 'Approaches',
        links: [
          { label: 'CBT', to: '/guides/anxiety' },
          { label: 'Trauma-informed', to: '/guides/ptsd' },
          { label: 'What to expect', to: '/guides' },
        ],
      },
    ],
    cta: { title: 'Matched in-clinic, not a national marketplace.', action: 'match' },
  },
  {
    id: 'guides',
    label: 'Guides',
    to: '/guides',
    columns: [
      {
        title: 'Learn about',
        links: GUIDES.map((g) => ({ label: g.title.replace(/^Understanding |^Living with |^After |^Grief that /, '').replace(/^Low mood.*/, 'Depression'), to: `/guides/${g.id}` })),
      },
    ],
  },
  {
    id: 'tests',
    label: 'Take a test',
    to: '/assessments',
    columns: [
      {
        title: 'Mental health',
        links: [
          { label: 'Anxiety check-in', to: '/assessments/anxiety' },
          { label: 'Mood & energy', to: '/assessments/mood' },
          { label: 'After something overwhelming', to: '/assessments/trauma' },
          { label: 'Emotional regulation', to: '/assessments/regulation' },
        ],
      },
      {
        title: 'Life & relationships',
        links: [
          { label: 'Relationship quality', to: '/assessments/relationship' },
          { label: 'Work burnout', to: '/assessments/burnout' },
          { label: 'Grief & loss', to: '/assessments/grief' },
          { label: 'Parenting stress', to: '/assessments/parenting' },
          { label: 'View all tests →', to: '/assessments' },
        ],
      },
    ],
  },
];

export const NAV_LINKS = [
  { label: 'Free resources', to: '/resources', badge: 'New' },
  { label: 'Community', to: '/community' },
  { label: 'Partnerships', to: '/partners' },
];

export function scoreAssessment(scores) {
  const total = scores.reduce((s, n) => s + n, 0);
  const max = scores.length * 3;
  const pct = max ? total / max : 0;
  const level = pct < 0.34 ? 'lower' : pct < 0.67 ? 'moderate' : 'higher';
  return { total, max, level };
}

export const LEVEL_COPY = {
  lower: 'These answers suggest a lighter load right now. If something still feels off, you can still talk with a therapist.',
  moderate: 'There is enough here to take seriously. A therapist or group can help you sort what to do next.',
  higher: 'This is taking up real space in your life. You do not have to hold it alone — matching with a clinician is a solid next step.',
};

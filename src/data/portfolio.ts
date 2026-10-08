export const profile = {
  name: 'Azhagar M',
  role: 'Frontend Developer',
  tagline: 'React.js · Next.js · React Native',
  phone: '+91 88709 56961',
  phoneHref: 'tel:+918870956961',
  email: 'azhagarbca@gmail.com',
  github: 'https://github.com/azhagarpy',
  githubLabel: 'github.com/azhagarpy',
  linkedin: 'https://linkedin.com/in/azhagarm',
  linkedinLabel: 'linkedin.com/in/azhagarm',
  resume: '/Azhagar_M_Frontend_Developer.pdf',
  photo: '/azhagar.png',
  summary:
    'Frontend Developer with 2+ years of experience building production web and mobile applications with React.js, Next.js, TypeScript and React Native. I delivered 5+ production applications at EWall Solutions, built a reusable component architecture shared across projects, and cut deployment time by 40% with Jenkins CI/CD pipelines.',
  stats: [
    { value: '2+', label: 'Years shipping' },
    { value: '5+', label: 'Production apps' },
    { value: '40%', label: 'Faster deploys' },
  ],
}

export const skills = [
  {
    group: 'Frontend',
    items: ['React.js', 'Next.js', 'TypeScript', 'JavaScript (ES6+)', 'React Native', 'Remix.js', 'HTML5', 'CSS3', 'Tailwind CSS'],
  },
  { group: 'State & Data', items: ['Redux', 'Context API', 'REST API integration'] },
  { group: 'Backend & CMS', items: ['Node.js', 'Express.js', 'REST APIs', 'Directus (headless CMS)'] },
  { group: 'DevOps & Tools', items: ['Git', 'GitHub', 'Jenkins (CI/CD)', 'PM2', 'Nginx', 'Linux'] },
]

export const experience = {
  role: 'Junior Software Developer',
  company: 'EWall Solutions Pvt. Ltd.',
  period: 'May 2024 — Present',
  points: [
    'Developed and maintained 5+ production web and mobile applications using React.js, Next.js, React Native and TypeScript.',
    'Built a reusable component architecture shared across projects, reducing duplicated code and speeding up delivery of new features.',
    'Owned features across the full lifecycle: requirement gathering with stakeholders, development, deployment and production support.',
    'Reduced deployment time by 40% by implementing CI/CD pipelines with Jenkins; deployed and managed apps on Linux servers using PM2 and Nginx.',
  ],
}

export const projects = [
  {
    name: 'Invoyro',
    kind: 'Invoice & e-Invoicing Platform',
    stack: ['Next.js', 'TypeScript', 'Express.js'],
    color: '#27e0d0',
    points: [
      'Built responsive invoice creation and management features with Next.js and TypeScript.',
      'Integrated Government e-Invoicing APIs so businesses generate compliant e-invoices right from the platform.',
      'Implemented dynamic PDF generation with multiple customizable invoice templates.',
    ],
  },
  {
    name: 'Quran & Prayer Times',
    kind: 'Cross-platform Mobile App',
    stack: ['React Native', 'TypeScript'],
    color: '#ffd166',
    points: [
      'Built one React Native + TypeScript codebase that ships to both Android and iOS.',
      'Implemented Quran reading, prayer times and Qibla direction features.',
      'Integrated device geolocation to calculate accurate, location-based prayer schedules.',
    ],
  },
  {
    name: 'Restaurant Recipe Manager',
    kind: 'Meal Planning System',
    stack: ['Remix.js', 'Directus'],
    color: '#ff7eb6',
    points: [
      'Built a Remix.js app to manage and display daily meal plans, configured for 20+ organizations.',
      'Integrated Directus as a headless CMS so meal plans and content update without code changes.',
      'Designed the UI and 15+ visual banner assets used across the application.',
    ],
  },
]

export const education = {
  degree: 'Bachelor of Computer Applications (BCA)',
  school: 'Thanthai Hans Roever College',
  year: '2024',
  score: '80%',
}

export const certifications = [{ name: 'Advanced React', issuer: 'Meta (Coursera)', date: 'Sep 2023' }]

export interface Zone {
  id: string
  name: string
  section: string
  accent: string
  vehicle: string
  blurb: string
}

export const zones: Zone[] = [
  { id: 'home', name: 'Hometown', section: 'Hello', accent: '#ffb547', vehicle: 'Auto Rickshaw', blurb: 'Where every journey starts' },
  { id: 'forest', name: 'Whispering Forest', section: 'About Me', accent: '#7ee06a', vehicle: 'Trail Jeep 4×4', blurb: 'Off-road into who I am' },
  { id: 'city', name: 'Skyline City', section: 'Skills', accent: '#4fc3ff', vehicle: 'Roadster EV', blurb: 'The tools I build with' },
  { id: 'neon', name: 'Neon District', section: 'Experience', accent: '#ff3ec8', vehicle: 'Neon Hoverbike', blurb: 'Where I ship for a living' },
  { id: 'ocean', name: 'Ocean Bridge', section: 'Projects', accent: '#27e0d0', vehicle: 'Seaplane', blurb: 'Islands of things I built' },
  { id: 'snow', name: 'Frostbite Peaks', section: 'Education', accent: '#9fd4ff', vehicle: 'Snowmobile', blurb: 'Trophies earned in the cold' },
  { id: 'launch', name: 'Launch Site', section: 'Contact', accent: '#ff7a45', vehicle: 'Mars Rover', blurb: 'Mission control is open' },
]

export const vehicleNames = [
  'Auto Rickshaw',
  'Trail Jeep 4×4',
  'Roadster EV',
  'Neon Hoverbike',
  'Seaplane',
  'Snowmobile',
  'Mars Rover',
  'Rocket AZ-1',
]

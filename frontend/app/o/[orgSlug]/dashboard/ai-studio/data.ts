import type { StudioContent, PosterTemplate } from "./types";

export const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  instagram: "Instagram",
  facebook: "Facebook",
  internal: "Internal",
  email: "Email",
};

export const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-[#0A66C2]",
  twitter: "bg-[#1DA1F2]",
  instagram: "bg-[#E4405F]",
  facebook: "bg-[#1877F2]",
  internal: "bg-violet-600",
  email: "bg-amber-600",
};

export const POSTER_TEMPLATES: PosterTemplate[] = [
  { id: "modern", name: "Modern", background: "from-violet-600 to-indigo-800", textColor: "#ffffff", accent: "#c4b5fd" },
  { id: "warm", name: "Warm", background: "from-amber-500 to-orange-700", textColor: "#ffffff", accent: "#fde68a" },
  { id: "cool", name: "Cool", background: "from-cyan-500 to-blue-700", textColor: "#ffffff", accent: "#67e8f9" },
  { id: "nature", name: "Nature", background: "from-emerald-500 to-teal-700", textColor: "#ffffff", accent: "#a7f3d0" },
  { id: "rose", name: "Rose", background: "from-pink-500 to-rose-700", textColor: "#ffffff", accent: "#fecdd3" },
  { id: "midnight", name: "Midnight", background: "from-slate-800 to-slate-950", textColor: "#ffffff", accent: "#94a3b8" },
  { id: "sunset", name: "Sunset", background: "from-purple-600 via-pink-500 to-orange-400", textColor: "#ffffff", accent: "#fbcfe8" },
  { id: "corporate", name: "Corporate", background: "from-blue-800 to-indigo-900", textColor: "#ffffff", accent: "#bfdbfe" },
];

export const MOCK_CONTENTS: StudioContent[] = [
  {
    id: "c1",
    title: "Welcome to JOY ERP v2.0",
    type: "blog",
    status: "published",
    platforms: ["linkedin", "internal"],
    scheduledAt: "2026-05-22T09:00:00",
    publishedAt: "2026-05-22T09:00:00",
    createdAt: "2026-05-20T10:30:00",
    body: "We are thrilled to announce the launch of JOY ERP v2.0! This major update brings a全新 AI-powered assistant, enhanced project management tools, and a redesigned interface that makes collaboration seamless.\n\nKey highlights include:\n- AI Studio for content creation\n- Advanced analytics dashboard\n- Improved kanban board\n- Real-time collaboration features\n\nStay tuned for more updates!",
    tags: ["announcement", "product-launch", "crm"],
  },
  {
    id: "c2",
    title: "Monthly Newsletter – June 2026",
    type: "email",
    status: "scheduled",
    platforms: ["email"],
    scheduledAt: "2026-06-01T08:00:00",
    publishedAt: null,
    createdAt: "2026-05-24T14:00:00",
    emailSubject: "Your June Update from JOY ERP",
    body: "Dear Team,\n\nHere's what happened this month at JOY ERP...\n\n- New AI Studio module launched\n- 3 major bug fixes\n- Performance improvements across the board\n\nBest regards,\nThe JOY Team",
    tags: ["newsletter", "monthly"],
  },
  {
    id: "c3",
    title: "Join Our Team!",
    type: "poster",
    status: "published",
    platforms: ["linkedin", "instagram", "facebook"],
    scheduledAt: "2026-05-18T10:00:00",
    publishedAt: "2026-05-18T10:00:00",
    createdAt: "2026-05-16T09:00:00",
    tags: ["recruitment", "hiring"],
    bgColor: "from-violet-600 to-indigo-800",
    textColor: "#ffffff",
    posterText: "WE'RE HIRING!\nJoin the JOY ERP Team",
  },
  {
    id: "c4",
    title: "Productivity Tip of the Week",
    type: "social",
    status: "published",
    platforms: ["linkedin", "twitter"],
    scheduledAt: "2026-05-23T12:00:00",
    publishedAt: "2026-05-23T12:00:00",
    createdAt: "2026-05-22T16:00:00",
    socialText: "Did you know? You can use keyboard shortcuts in JOY ERP to navigate 3x faster!\n\nCtrl+K → Quick search\nCtrl+N → New task\nCtrl+Shift+P → New project\n\n#Productivity #ERPtips #WorkSmarter",
    tags: ["productivity", "tips"],
  },
  {
    id: "c5",
    title: "End of Quarter Review",
    type: "blog",
    status: "draft",
    platforms: ["internal"],
    scheduledAt: null,
    publishedAt: null,
    createdAt: "2026-05-25T11:00:00",
    body: "Q2 2026 has been an incredible quarter for JOY ERP...\n\n[Content in progress]",
    tags: ["quarterly", "review"],
  },
  {
    id: "c6",
    title: "New Feature: AI Content Studio",
    type: "social",
    status: "scheduled",
    platforms: ["linkedin", "twitter", "facebook"],
    scheduledAt: "2026-05-28T09:00:00",
    publishedAt: null,
    createdAt: "2026-05-25T08:30:00",
    socialText: "Excited to announce AI Studio – your new content creation powerhouse inside JOY ERP!\n\nCreate blogs, posters, social posts and emails with AI assistance. Schedule across all your platforms from one place.\n\n#AIContent #ERP #Productivity",
    tags: ["feature", "ai", "announcement"],
  },
  {
    id: "c7",
    title: "Company Picnic Invitation",
    type: "poster",
    status: "draft",
    platforms: ["internal", "email"],
    scheduledAt: null,
    publishedAt: null,
    createdAt: "2026-05-26T13:00:00",
    tags: ["events", "team-building"],
    bgColor: "from-emerald-500 to-teal-700",
    textColor: "#ffffff",
    posterText: "Annual Company Picnic\nJuly 15th @ Riverside Park",
  },
  {
    id: "c8",
    title: "Weekly Team Standup Notes",
    type: "email",
    status: "archived",
    platforms: ["email"],
    scheduledAt: "2026-05-20T08:00:00",
    publishedAt: "2026-05-20T08:00:00",
    createdAt: "2026-05-19T17:00:00",
    emailSubject: "Standup Notes – Week 21",
    body: "Team,\n\nHere are the highlights from today's standup:\n\n- AI Studio: Frontend UI complete\n- Calendar module: Bug fix in progress\n- User permissions: Testing phase\n\nLet's keep up the momentum!\n\nBest,\nProduct",
    tags: ["standup", "internal"],
  },
];

export function generateId(): string {
  return `c${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function simulateAI(delay = 1200): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const samples = [
        "In today's fast-paced business environment, staying ahead of the curve is more important than ever. JOY ERP empowers your team to collaborate seamlessly, track projects efficiently, and deliver results that matter.\n\nOur latest AI-powered features make content creation effortless — from blog posts to social media updates, everything you need is just a click away.",
        "Transform the way your team works with JOY ERP. Our platform brings together project management, team collaboration, and AI-powered content creation in one unified experience.\n\nWhy settle for less when you can have it all?",
        "Did you know that teams using JOY ERP report a 40% increase in productivity? Our integrated tools help you streamline workflows, reduce manual tasks, and focus on what truly matters — growing your business.",
      ];
      resolve(samples[Math.floor(Math.random() * samples.length)]);
    }, delay);
  });
}

export function simulateAISocial(delay = 1000): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const samples = [
        "Excited to share our latest milestone! 🚀 JOY ERP just hit a new record — 10,000 active users. Thank you to our amazing community for your continued support!\n\n#JOYERP #Milestone #Growth",
        "Productivity hack: Use AI Studio in JOY ERP to generate your social content in seconds. Save hours every week! ⏱️✨\n\n#Productivity #AIContent #ERP",
        "Behind every great team is a great tool. JOY ERP helps you stay organized, collaborate better, and achieve more. Try it today! 💪\n\n#TeamWork #ERP #Productivity",
      ];
      resolve(samples[Math.floor(Math.random() * samples.length)]);
    }, delay);
  });
}

export function simulateAIEmail(delay = 1300): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const samples = [
        "Dear Team,\n\nI hope this message finds you well. Here's a quick update on our progress this month:\n\n• Successfully launched the AI Studio module\n• Resolved 15+ support tickets\n• Improved system performance by 25%\n\nThank you for your continued hard work and dedication.\n\nBest regards,\nThe Management Team",
        "Hi everyone,\n\nAs we wrap up another successful month, I wanted to take a moment to recognize the incredible work being done across all departments.\n\nYour commitment to excellence is what makes JOY ERP great.\n\nLet's keep pushing boundaries!\n\nWarmly,\nLeadership",
      ];
      resolve(samples[Math.floor(Math.random() * samples.length)]);
    }, delay);
  });
}

export function simulateAIHashtags(delay = 600): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const sets = [
        ["#Productivity", "#CRMTips", "#WorkSmarter", "#TeamCollaboration", "#BusinessGrowth"],
        ["#Innovation", "#Technology", "#FutureOfWork", "#DigitalTransformation", "#AI"],
        ["#Leadership", "#TeamWork", "#Success", "#Motivation", "#GrowthMindset"],
      ];
      resolve(sets[Math.floor(Math.random() * sets.length)]);
    }, delay);
  });
}

export const TOUR_STORAGE_KEY = 'closerai_tour_completed';

export type TourStep = {
  element: string;
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
};

export const tourSteps: TourStep[] = [
  {
    element: '[data-tour="brand"]',
    title: 'Welcome to CloserAI',
    description:
      'Your sales call intelligence hub. This short tour walks through each area of the app so you know where to work.',
    side: 'right',
    align: 'start',
  },
  {
    element: '[data-tour="nav-overview"]',
    title: 'Overview',
    description:
      'Your command center — KPIs, call trends, outcomes, and high-intent conversations at a glance.',
    side: 'right',
    align: 'start',
  },
  {
    element: '[data-tour="nav-leads"]',
    title: 'Leads',
    description:
      'Add and manage prospects, import lists, and launch AI calls to individual leads from here.',
    side: 'right',
    align: 'start',
  },
  {
    element: '[data-tour="nav-campaigns"]',
    title: 'Campaigns',
    description:
      'Create outbound campaigns with a Retell agent, phone number, and objective, then activate or pause them.',
    side: 'right',
    align: 'start',
  },
  {
    element: '[data-tour="nav-calls"]',
    title: 'Calls',
    description:
      'Review every outbound and web call — outcomes, transcripts, qualification scores, and next steps.',
    side: 'right',
    align: 'start',
  },
  {
    element: '[data-tour="nav-appointments"]',
    title: 'Appointments',
    description:
      'Meetings the AI booked for you. Check upcoming, past, and canceled appointments in one place.',
    side: 'right',
    align: 'start',
  },
  {
    element: '[data-tour="nav-analytics"]',
    title: 'Analytics',
    description:
      'Dig into qualification funnels, call outcomes, and campaign conversion to see what is working.',
    side: 'right',
    align: 'start',
  },
  {
    element: '[data-tour="nav-settings"]',
    title: 'Settings',
    description:
      'Organization details, Retell configuration status, compliance rules, and knowledge-base setup.',
    side: 'right',
    align: 'start',
  },
  {
    element: '[data-tour="tour-replay"]',
    title: 'Need a refresher?',
    description:
      'You can replay this tour anytime from here. You are ready to start closing with CloserAI.',
    side: 'right',
    align: 'end',
  },
];

export function hasCompletedTour(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
}

export function markTourCompleted(): void {
  window.localStorage.setItem(TOUR_STORAGE_KEY, 'true');
}

export function resetTourCompletion(): void {
  window.localStorage.removeItem(TOUR_STORAGE_KEY);
}

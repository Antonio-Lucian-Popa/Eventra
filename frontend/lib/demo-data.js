export const demoUser = {
  name: 'Andrei Popescu',
  email: 'admin@eveniment.local',
  role: 'Administrator',
};

export const demoStats = {
  currentMonthEvents: 18,
  estimatedRevenue: 87450,
  actualRevenue: 62300,
  outstandingDeposits: 12750,
  occupancyRate: 76,
};

export const demoVenues = [
  { id: 'salon-imperial', name: 'Salon Imperial', capacity: 250, occupancyRate: 92, events: 9, revenue: 34200 },
  { id: 'salon-crystal', name: 'Salon Crystal', capacity: 180, occupancyRate: 78, events: 6, revenue: 18750 },
  { id: 'salon-royal', name: 'Salon Royal', capacity: 120, occupancyRate: 61, events: 3, revenue: 7850 },
  { id: 'terasa-garden', name: 'Terasa Garden', capacity: 90, occupancyRate: 48, events: 2, revenue: 4250 },
];

export const demoEvents = [
  {
    id: 'event-andreea-mihai',
    title: 'Nuntă Andreea & Mihai',
    eventType: 'wedding',
    eventDate: '2026-05-24T18:00:00.000Z',
    startTime: '18:00',
    endTime: '03:00',
    guestsCount: 250,
    status: 'confirmed',
    totalAmount: 18750,
    depositAmount: 5000,
    paidAmount: 5000,
    remainingAmount: 13750,
    client: { fullName: 'Andreea Popescu', phone: '0722 123 456', email: 'andreea.popescu@email.com' },
    venue: { name: 'Salon Imperial' },
    notes: 'Mirii doresc ca decorul să fie pe tonuri de alb și verde. Preferințe muzicale: pop, dance, latino.',
  },
  {
    id: 'event-alex',
    title: 'Majorat Alex',
    eventType: 'birthday',
    eventDate: '2026-05-25T19:00:00.000Z',
    startTime: '19:00',
    guestsCount: 80,
    status: 'confirmed',
    totalAmount: 2500,
    depositAmount: 800,
    paidAmount: 500,
    remainingAmount: 2000,
    client: { fullName: 'Alexandru Matei', phone: '0795 321 654', email: 'alex.matei@email.com' },
    venue: { name: 'Salon Crystal' },
  },
  {
    id: 'event-sofia',
    title: 'Botez Sofia Maria',
    eventType: 'baptism',
    eventDate: '2026-05-26T16:00:00.000Z',
    startTime: '16:00',
    guestsCount: 120,
    status: 'in_preparation',
    totalAmount: 7500,
    depositAmount: 2000,
    paidAmount: 2500,
    remainingAmount: 5000,
    client: { fullName: 'Maria & Vlad Stoica', phone: '0744 780 321', email: 'maria.stoica@email.com' },
    venue: { name: 'Salon Royal' },
  },
  {
    id: 'event-gala',
    title: 'Corporate - Gala Awards',
    eventType: 'corporate',
    eventDate: '2026-05-28T20:00:00.000Z',
    startTime: '20:00',
    guestsCount: 200,
    status: 'confirmed',
    totalAmount: 42000,
    depositAmount: 10000,
    paidAmount: 17000,
    remainingAmount: 25000,
    client: { fullName: 'Gala Awards SRL', phone: '0730 111 222', email: 'events@gala.ro' },
    venue: { name: 'Salon Imperial' },
  },
];

export const demoClients = [
  { id: 'c1', fullName: 'Andreea Popescu', phone: '0722 123 456', email: 'andreea.popescu@email.com', events: 1, totalPaid: 5000 },
  { id: 'c2', fullName: 'Ioana & Radu Ionescu', phone: '0723 456 789', email: 'ionescu.radu@email.com', events: 1, totalPaid: 2000 },
  { id: 'c3', fullName: 'Maria & Vlad Stoica', phone: '0744 780 321', email: 'maria.stoica@email.com', events: 2, totalPaid: 7500 },
  { id: 'c4', fullName: 'Alexandru Matei', phone: '0795 321 654', email: 'alex.matei@email.com', events: 1, totalPaid: 1500 },
  { id: 'c5', fullName: 'Laura & Andrei Pavel', phone: '0720 987 654', email: 'laura.pavel@email.com', events: 1, totalPaid: 4000 },
  { id: 'c6', fullName: 'David Popa', phone: '0741 258 369', email: 'david.popa@email.com', events: 1, totalPaid: 2500 },
];

export const demoInvoices = [
  { id: 'f1', invoiceNumber: 'FCT-2026-015', client: { fullName: 'Andreea Popescu' }, createdAt: '2026-05-12', dueDate: '2026-06-10', amount: 18750, status: 'partially_paid' },
  { id: 'f2', invoiceNumber: 'FCT-2026-014', client: { fullName: 'Ioana & Radu Ionescu' }, createdAt: '2026-05-10', dueDate: '2026-06-10', amount: 12500, status: 'unpaid' },
  { id: 'f3', invoiceNumber: 'FCT-2026-013', client: { fullName: 'Maria & Vlad Stoica' }, createdAt: '2026-05-08', dueDate: '2026-06-08', amount: 22100, status: 'paid' },
  { id: 'f4', invoiceNumber: 'FCT-2026-012', client: { fullName: 'Alexandru Matei' }, createdAt: '2026-05-05', dueDate: '2026-06-05', amount: 8750, status: 'partially_paid' },
  { id: 'f5', invoiceNumber: 'FCT-2026-011', client: { fullName: 'Laura & Andrei Pavel' }, createdAt: '2026-05-02', dueDate: '2026-06-02', amount: 10000, status: 'unpaid' },
];

export const revenueChart = [
  { month: 'Ian', estimated: 64000, actual: 45000 },
  { month: 'Feb', estimated: 69000, actual: 56000 },
  { month: 'Mar', estimated: 78000, actual: 54000 },
  { month: 'Apr', estimated: 78000, actual: 56000 },
  { month: 'Mai', estimated: 87450, actual: 62300 },
  { month: 'Iun', estimated: 83000, actual: 0 },
  { month: 'Iul', estimated: 76000, actual: 0 },
  { month: 'Aug', estimated: 85000, actual: 0 },
  { month: 'Sep', estimated: 80000, actual: 0 },
  { month: 'Oct', estimated: 74000, actual: 0 },
  { month: 'Nov', estimated: 65000, actual: 0 },
  { month: 'Dec', estimated: 68000, actual: 0 },
];

export const eventDistribution = [
  { name: 'Nunți', value: 10, color: '#7c3aed' },
  { name: 'Botezuri', value: 4, color: '#3b82f6' },
  { name: 'Majorate', value: 3, color: '#22c55e' },
  { name: 'Corporate', value: 1, color: '#f97316' },
];

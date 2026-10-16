/** Counts cover the current UTC day and the preceding 29 UTC days. */
export type MonitoringDaily = {
  date: string;
  visitors: number;
  visits: number;
  newAccounts: number;
  logins: number;
};

export type SignupNotification = {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  readAt: string | null;
};

export type MonitoringSummary = {
  /** False means monitoring has not been installed or cannot be read; zeros are not measurements. */
  available: boolean;
  since: string;
  uniqueVisitors: number;
  visits: number;
  newAccounts: number;
  signedInUsers: number;
  logins: number;
  daily: MonitoringDaily[];
  /** First 50 notifications: unread first, newest within each group. Refresh after a read to reveal older unread rows. */
  notifications: SignupNotification[];
  unreadCount: number;
  delivery: { configured: boolean; channel: string | null };
};

export type VisitSource = "direct" | "search" | "referral";

export type MonitoringVisit = {
  visitorId: string;
  sessionId: string;
  path: string;
  source: VisitSource;
};

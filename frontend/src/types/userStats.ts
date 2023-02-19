import { User } from "./user";

export type UserStats = {
  count: number;
  countByRole: {
    admin: number;
    guest: number;
    member: number;
  };
  countByStatus: {
    active: number;
    disabled: number;
  };
  recentlyAdded: User[];
  recentlyUpdated: User[];
};

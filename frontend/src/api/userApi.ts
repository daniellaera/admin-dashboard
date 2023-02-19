import { User } from "../types/user";
import { UserStats } from "../types/userStats";

const users = [
  {
    id: "1",
    createdAt: new Date(2022, 1, 11),
    disabled: false,
    email: "rhys@arriaga.com",
    firstName: "Rhys",
    lastName: "Arriaga",
    role: "Admin",
    lastModifiedAt: new Date(2022, 1, 11)
  },
  {
    id: "2",
    createdAt: new Date(2022, 2, 12),
    disabled: false,
    email: "laura@core.com",
    firstName: "Laura",
    lastName: "Core",
    role: "Member",
    lastModifiedAt: new Date(2022, 3, 22)
  },
  {
    id: "3",
    createdAt: new Date(2022, 3, 13),
    disabled: false,
    email: "joshua@jagger.com",
    firstName: "Joshua",
    lastName: "Jagger",
    role: "Member",
    lastModifiedAt: new Date(2022, 3, 13)
  },
  {
    id: "4",
    createdAt: new Date(2022, 4, 14),
    disabled: true,
    email: "jason@jimenez.com",
    firstName: "Jason",
    lastName: "Jimenez",
    role: "Member",
    lastModifiedAt: new Date(2022, 5, 24)
  },
  {
    id: "5",
    createdAt: new Date(2022, 5, 15),
    disabled: true,
    email: "rhonda@mcguire.com",
    firstName: "Rhonda",
    lastName: "Mcguire",
    role: "Member",
    lastModifiedAt: new Date(2022, 5, 15)
  },
  {
    id: "6",
    createdAt: new Date(2022, 6, 16),
    disabled: false,
    email: "aaron@moreno.com",
    firstName: "Aaron",
    lastName: "Moreno",
    role: "Member",
    lastModifiedAt: new Date(2022, 7, 26)
  },
  {
    id: "7",
    createdAt: new Date(2022, 7, 17),
    disabled: false,
    email: "carley@murray.com",
    firstName: "Carley",
    lastName: "Murray",
    role: "Member",
    lastModifiedAt: new Date(2022, 7, 17)
  },
  {
    id: "8",
    createdAt: new Date(2022, 8, 18),
    disabled: false,
    email: "cherise@owen.com",
    firstName: "Cherise",
    lastName: "Owen",
    role: "Member",
    lastModifiedAt: new Date(2022, 9, 28)
  },
  {
    id: "9",
    createdAt: new Date(2022, 9, 19),
    disabled: false,
    email: "nathan@romero.com",
    firstName: "Nathan",
    lastName: "Romero",
    role: "Member",
    lastModifiedAt: new Date(2022, 9, 19)
  },
  {
    id: "10",
    createdAt: new Date(2022, 10, 20),
    disabled: false,
    email: "olivia@spence.com",
    firstName: "Olivia",
    lastName: "Spence",
    role: "Guest",
    lastModifiedAt: new Date(2022, 11, 30)
  },
  {
    id: "11",
    createdAt: new Date(2022, 11, 21),
    disabled: false,
    email: "elisha@wade.com",
    firstName: "Elisha",
    lastName: "Wade",
    role: "Guest",
    lastModifiedAt: new Date(2022, 11, 21)
  }
];

function generateId() {
  return (Math.floor(Math.random() * 10000) + 1).toString();
}

function getUserStats() {
  return {
    count: users.length,
    countByRole: {
      admin: users.filter((u) => u.role === "Admin").length,
      guest: users.filter((u) => u.role === "Guest").length,
      member: users.filter((u) => u.role === "Member").length
    },
    countByStatus: {
      active: users.filter((u) => !u.disabled).length,
      disabled: users.filter((u) => u.disabled).length
    },
    recentlyAdded: users
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 3),
    recentlyUpdated: users
      .sort((a, b) => a.lastModifiedAt.getTime() - b.lastModifiedAt.getTime())
      .slice(0, 3)
  };
}

export async function addUser(user: User): Promise<User> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ...user, id: generateId() });
    }, 2000);
  });
}

export async function fetchUserById(id: string): Promise<User> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(users.find((user) => user.id === id) as User);
    }, 1000);
  });
}

export async function fetchUserStats(): Promise<UserStats> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getUserStats());
    }, 1000);
  });
}

export async function fetchUsers(): Promise<User[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(users);
    }, 1000);
  });
}

export async function removeUser(user: User): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(user.id);
    }, 2000);
  });
}

export async function searchUsers(query: string): Promise<User[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        users.filter((user) =>
          `${user.firstName} ${user.lastName}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
      );
    }, 1000);
  });
}

export async function updateUser(user: User): Promise<User> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(user);
    }, 2000);
  });
}

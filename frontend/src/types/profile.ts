import { Experience } from "./experience"

export type Profile = {
  id: number
  createdAt?: Date
  updatedAt?: Date
  avatarUrl?: string
  username?: string
  website?: string
  company?: string
  authorEmail: string
  isPublic?: boolean;
  experiences?: Experience[]
}
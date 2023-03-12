import { Experience } from "./experience"
import { ProgrammingLanguage } from "./programmingLanguage"

export type Profile = {
  id: number
  createdAt?: Date
  updatedAt?: Date
  avatarUrl?: string
  bio?: string
  username?: string
  website?: string
  company?: string
  authorEmail: string
  isPublic?: boolean;
  experiences?: Experience[]
  programmingLanguages?: ProgrammingLanguage[]
}
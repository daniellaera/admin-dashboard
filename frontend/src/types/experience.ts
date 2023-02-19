export type Experience = {
    id: number
    createdAt?: Date
    updatedAt?: Date
    title: string
    description: string
    company: string
    location: string
    from: Date
    to: Date
    current?: boolean
    profileId: number
  }
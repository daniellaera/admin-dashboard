export type Education = {
    id: number
    createdAt?: Date
    updatedAt?: Date
    school: string
    description: string
    degree: string
    fieldOfStudy: string
    from: Date
    to: Date
    current?: boolean
    profileId: number
}
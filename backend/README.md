# Express API Starter with Typescript

if you want to add new fields in your schema and apply migrations to your local/supabase database:

- add your fields to your `schema.prisma`

- make sure you are on local database first `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supabase_react_auth_db?schema=public"` 

- apply migrations `npx prisma migrate dev --name add_comments`
- switch back to your supabase db URI
`DATABASE_URL="postgresql://postgres:Only_for_me_2023@db.aetkrjbqdijselycidyg.supabase.co:5432/postgres"`

- execute new migrations
`npx prisma migrate deploy`

test app container image, ex: backend
`cd backend & docker build -t test-backend .` then > `docker run -p 8080:8080 -d test-backend`

create custom Prisma migration script and edit: `npx prisma migrate dev --create-only`

the modify the created.sql with your custom sql script

then apply migrations with DATABASE_URL connected to your supabase service: `npx prisma migrate deploy`

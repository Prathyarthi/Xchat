import { Elysia, t } from 'elysia'



const app = new Elysia({ prefix: '/api' })

export const GET = app.fetch 
export const POST = app.fetch

export type AppType = typeof app
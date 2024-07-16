import * as z from "zod"

export const userAuthSchema = z.object({
  username: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

import { z } from 'zod'

// Same rules as the frontend validators. The server never trusts the client.
const password = z
  .string({ required_error: 'Enter a password.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use at least one letter and one number.')

const email = z
  .string({ required_error: 'Enter your email address.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254)

export const signupSchema = z.object({
  name: z.string({ required_error: 'Enter your name.' }).trim().min(2, 'Name must be at least 2 characters.').max(60),
  email,
  password,
})

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Enter your password.' }).min(1, 'Enter your password.').max(72),
})

// Canonical units: cm / kg. Keep ranges in sync with src/data/measurementFields.js on the frontend.
const num = (min, max) => z.number().min(min).max(max).nullable()

export const userDataSchema = z.object({
  profile: z.object({
    name: z.string().max(60),
    genderPreference: z.enum(['', 'men', 'women', 'unisex']),
    bodyShape: z.string().max(40).nullable(),
    savedProductIds: z.array(z.string().max(64)).max(500),
    preferences: z.record(z.string(), z.any()),
  }),
  measurements: z.object({
    height: num(100, 230),
    weight: num(25, 250),
    chest: num(60, 170),
    waist: num(45, 170),
    hips: num(60, 180),
    shoulder: num(30, 70),
    inseam: num(50, 110),
    footLength: num(15, 35),
    headCircumference: num(45, 70),
    displayUnits: z.object({ length: z.enum(['cm', 'in']), weight: z.enum(['kg', 'lbs']) }),
  }),
  sizeHistory: z.array(z.any()).max(200),
  tryOnHistory: z.array(z.any()).max(200),
})

export const ANGLES = ['front', 'left', 'right', 'back']
export const angleSchema = z.enum(['front', 'left', 'right', 'back'], { errorMap: () => ({ message: 'Unknown photo angle.' }) })
export const consentSchema = z.object({ granted: z.boolean({ required_error: 'Consent choice is required.' }) })

export const googleSchema = z.object({ credential: z.string({ required_error: 'Missing Google credential.' }).min(20).max(4096) })
export const deleteAccountSchema = z
  .object({ password: z.string().min(1).max(72).optional(), credential: z.string().min(20).max(4096).optional() })
  .refine((v) => v.password || v.credential, { message: 'Confirm with your password, or with Google.' })

// These unit tests inject Stripe/Auth/database doubles. Any accidental attempt
// to create a real network client must fail before contacting a live service.
export function createClient(): never { throw new Error('Unexpected live Supabase client in billing unit test'); }
export default class Stripe {
  constructor() { throw new Error('Unexpected live Stripe client in billing unit test'); }
}

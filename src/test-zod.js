import { z } from 'zod';
// Define a simple schema
const schema = z.object({
    name: z.string(),
    age: z.number()
});
// Define an enum
const searchModes = ['Top', 'Latest', 'Photos', 'Videos'];
const searchModeSchema = z.enum(searchModes);
console.log('Schema:', schema);
console.log('Enum Schema:', searchModeSchema);

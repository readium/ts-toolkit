// Quick way to generate random message identifiers with embedded times

const maxint = Math.pow(2, 32);
const rstr = () => Math.round(Math.random() * maxint).toString(36);
export const mid = () => `${Math.round(performance.now())}-${rstr()}-${rstr()}`;
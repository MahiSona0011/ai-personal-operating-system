export const MAIL_PORT = Number(process.env.E2E_MAIL_PORT ?? 4010);
export const MAIL_URL = `http://localhost:${MAIL_PORT}`;
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";

export function getServerApiBaseUrl(): string {
  const apiUrl = process.env.API_URL?.replace(/\/$/, '');
  if (apiUrl) return `${apiUrl}/api/v1`;

  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) return configured;

  return 'http://localhost:3001/api/v1';
}

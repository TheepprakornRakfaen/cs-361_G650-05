// TODO: ยังไม่มีโค้ดจริง
export const handler = async () => ({
  statusCode: 501,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ message: 'not implemented yet' }),
});

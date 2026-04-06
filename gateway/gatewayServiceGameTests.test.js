// Tests moved to gateway-service.test.js to avoid EADDRINUSE port conflict.
// Both files required gateway-service at module load time, causing two servers
// to attempt binding port 8000 simultaneously when Jest ran them in parallel.

test('placeholder - tests moved to gateway-service.test.js', () => {
  expect(true).toBe(true);
});

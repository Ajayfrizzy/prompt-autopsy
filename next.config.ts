import type {NextConfig} from 'next';
import {networkInterfaces} from 'node:os';

// Next's development-origin checks also protect its HMR/debug connection.
// Allow this machine's exact addresses, not arbitrary sites or IP wildcards.
const localAddresses = Object.values(networkInterfaces()).flatMap(entries =>
  (entries ?? []).filter(entry => entry.family === 'IPv4').map(entry => entry.address)
);
const config: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '[::1]', ...new Set(localAddresses)],
};
export default config;

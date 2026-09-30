import {expect,it} from 'vitest';
import config from '../next.config';
it('allows loopback development hydration without allowing arbitrary origins',()=>{
 expect(config.allowedDevOrigins).toContain('127.0.0.1');
 expect(config.allowedDevOrigins).toContain('[::1]');
 expect(config.allowedDevOrigins?.some(origin=>origin.includes('*'))).toBe(false);
 expect(config.allowedDevOrigins).not.toContain('example.com');
});

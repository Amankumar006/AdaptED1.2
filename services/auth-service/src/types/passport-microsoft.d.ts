declare module 'passport-microsoft' {
  import { Strategy as PassportStrategy } from 'passport';
  // Minimal typing to satisfy compilation; replace with official types if available
  export interface MicrosoftStrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }
  export class Strategy implements PassportStrategy {
    name: string;
    authenticate: any;
    constructor(options: MicrosoftStrategyOptions, verify: (...args: any[]) => void);
  }
}

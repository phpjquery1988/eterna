import * as crypto from 'crypto';


export function generateAgentHash(agentDetails: string): string {
   const timestamp = new Date().toISOString();
   const dataToHash = `${agentDetails}-${timestamp}`;
   return crypto.createHash('md5').update(dataToHash).digest('hex');
 }

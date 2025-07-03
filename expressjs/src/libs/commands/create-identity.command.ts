import { IdentityProviderEnum } from '../enums';

export class CreateIdentityCommand {
  token?: string;
  secret?: string;
  refreshToken?: string;
  expirationDate?: Date;
  provider: any;
  uid: any;
  version: any;
  userName?: string;
  user: any;
}

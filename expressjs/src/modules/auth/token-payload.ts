import { IdentityProviderEnum } from "../../libs/contracts/src/index"

export interface TokenPayload {
  username: string;
  sub: string;
  role: string;
  version: number;
  provider: IdentityProviderEnum;
}
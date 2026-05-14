import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import type { AuthenticatedRequest } from "./authenticated-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    const issuer = this.getRequiredConfig("KEYCLOAK_ISSUER");
    const { payload } = await jwtVerify(token, this.getJwks(), {
      issuer,
    });

    this.assertExpectedClient(payload);

    if (!payload.sub) {
      throw new UnauthorizedException("JWT subject is required");
    }

    request.user = {
      id: payload.sub,
      username: typeof payload.preferred_username === "string" ? payload.preferred_username : undefined,
    };

    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string {
    const authorization = request.headers.authorization;
    const value = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!value?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer token is required");
    }

    return value.slice("Bearer ".length);
  }

  private getJwks(): ReturnType<typeof createRemoteJWKSet> {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(this.getRequiredConfig("KEYCLOAK_JWKS_URI")));
    }

    return this.jwks;
  }

  private assertExpectedClient(payload: JWTPayload): void {
    const expectedClientId = this.config.get<string>("KEYCLOAK_CLIENT_ID");

    if (!expectedClientId) {
      return;
    }

    const audiences = typeof payload.aud === "string" ? [payload.aud] : payload.aud ?? [];
    const authorizedParty = typeof payload.azp === "string" ? payload.azp : undefined;

    if (authorizedParty !== expectedClientId && !audiences.includes(expectedClientId)) {
      throw new UnauthorizedException("JWT was not issued for this client");
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.config.get<string>(key);

    if (!value) {
      throw new Error(`${key} is required`);
    }

    return value;
  }
}
